/**
 * Capacity Module
 *
 * Enforces rate limits, token caps, and concurrency limits.
 * All limits loaded from infrastructure/capacity/rate_limits.yaml.
 */

import { Module } from '@nestjs/common';
import { RateLimiter } from '@packages/governance/capacity/rate-limiter';
import { TokenCapService } from '@packages/governance/capacity/token-cap.service';
import { ConcurrencyGuard } from '@packages/governance/capacity/concurrency-guard';
import { CapacityGuard } from './capacity-guard.middleware';
import { DbModule } from '../../db/db.module';

@Module({
  imports: [DbModule],
  providers: [
    RateLimiter,
    TokenCapService,
    ConcurrencyGuard,
    CapacityGuard,
  ],
  exports: [RateLimiter, TokenCapService, ConcurrencyGuard],
})
export class CapacityModule {}
