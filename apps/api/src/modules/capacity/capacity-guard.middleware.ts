import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RateLimiter } from '@governance/capacity/rate-limiter';
import { TokenCapService } from '@governance/capacity/token-cap.service';

@Injectable()
export class CapacityGuard implements NestMiddleware {
  constructor(
    private readonly rateLimiter: RateLimiter,
    private readonly tokenCap: TokenCapService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const role = req.headers['x-role'] as string || 'default';

    // Rate limit check
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

    // Estimate tokens from request body
    const bodyText = JSON.stringify(req.body);
    const estimatedTokens = this.tokenCap.estimateTokens(bodyText);

    // Token cap check
    const budget = await this.tokenCap.checkBudget(tenantId, estimatedTokens);
    if (!budget.allowed) {
      throw new HttpException(
        {
          error: 'Daily token budget exceeded',
          remaining: budget.remaining,
          code: 'TOKEN_CAP_EXCEEDED',
        },
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }

    // Consume tokens after successful processing
    res.on('finish', async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        await this.tokenCap.consumeTokens(tenantId, estimatedTokens);
      }
    });

    next();
  }
}
