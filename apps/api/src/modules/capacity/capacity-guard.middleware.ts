import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RateLimiter } from '@packages/governance/capacity/rate-limiter';
import { TokenCapService } from '@packages/governance/capacity/token-cap.service';
import { ConcurrencyGuard } from '@packages/governance/capacity/concurrency-guard';

interface ExecutionSlot {
  executionId: string;
  acquiredAt: number;
}

interface RequestWithExecution extends Request {
  executionSlot: ExecutionSlot;
}

@Injectable()
export class CapacityGuard implements NestMiddleware {
  constructor(
    private readonly rateLimiter: RateLimiter,
    private readonly tokenCap: TokenCapService,
    private readonly concurrencyGuard: ConcurrencyGuard,
  ) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const role = req.headers['x-role'] as string || 'default';

    // Rate limit check (from YAML config)
    const rateLimit = await this.rateLimiter.isAllowed(tenantId, role);
    if (!rateLimit.allowed) {
      res.setHeader('Retry-After', String(rateLimit.retryAfter ?? 60));
      throw new HttpException(
        {
          error: 'Rate limit exceeded',
          retryAfter: rateLimit.retryAfter,
          code: 'RATE_LIMIT_EXCEEDED',
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // Concurrency guard (from YAML config)
    const capacityConfig = this.rateLimiter.getCapacityConfig(role);
    const concurrencyConfig = capacityConfig?.concurrency ?? { maxExecutions: 5, queueTimeoutMs: 30000 };
    
    const slot = await this.concurrencyGuard.acquireSlot(tenantId, concurrencyConfig, {
      userId: req.headers['x-user-id'] as string,
    });
    
    if (!slot) {
      throw new HttpException(
        {
          error: 'Concurrency limit reached',
          code: 'CONCURRENCY_LIMIT_EXCEEDED',
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // Store execution ID on request for later release
    (req as unknown as RequestWithExecution).executionSlot = slot;

    // Estimate tokens from request body
    const bodyText = JSON.stringify(req.body);
    const estimatedTokens = this.tokenCap.estimateTokens(bodyText);

    // Token cap check
    const budget = await this.tokenCap.checkBudget(tenantId, estimatedTokens);
    if (!budget.allowed) {
      // Release concurrency slot before rejecting
      this.concurrencyGuard.releaseSlot(tenantId, slot.executionId);
      throw new HttpException(
        {
          error: 'Daily token budget exceeded',
          remaining: budget.remaining,
          code: 'TOKEN_CAP_EXCEEDED',
        },
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }

    // Cleanup on response finish
    res.on('finish', async () => {
      // Release concurrency slot
      this.concurrencyGuard.releaseSlot(tenantId, slot.executionId);
      
      // Consume tokens after successful processing
      if (res.statusCode >= 200 && res.statusCode < 300) {
        await this.tokenCap.consumeTokens(tenantId, estimatedTokens);
      }
    });

    next();
  }
}
