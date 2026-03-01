/**
 * Token Bucket Rate Limiter
 *
 * Per-tenant, per-role rate limiting for API requests.
 */

import { Injectable, Optional, Logger } from '@nestjs/common';
import type { Clock } from '../runtime/clock.js';
import { SystemClock } from '../runtime/clock.js';

interface TokenBucket {
  tokens: number;
  lastRefill: number;
  capacity: number;
}

export interface RateLimitConfig {
  requestsPerSecond: number;
  burstSize: number;
}

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class RateLimiter {
  private readonly logger = new Logger(RateLimiter.name);
  private readonly clock: Clock;
  private buckets: Map<string, TokenBucket> = new Map();
  private lastCleanupAt = 0;

  // Role-based limits
  private roleLimits: Map<string, RateLimitConfig> = new Map([
    ['default', { requestsPerSecond: 10, burstSize: 20 }],
    ['premium', { requestsPerSecond: 100, burstSize: 200 }],
    ['enterprise', { requestsPerSecond: 500, burstSize: 1000 }],
    ['admin', { requestsPerSecond: 1000, burstSize: 2000 }],
  ]);

  constructor(@Optional() clock?: Clock) {
    this.clock = clock ?? new SystemClock();
  }

  /**
   * Cleanup stale buckets (lazy: on access when 5+ min since last cleanup)
   */
  private maybeCleanup(): void {
    const now = this.clock.now().getTime();
    if (now - this.lastCleanupAt > CLEANUP_INTERVAL_MS) {
      this.cleanup();
      this.lastCleanupAt = now;
    }
  }

  /**
   * Check if request is allowed
   */
  async isAllowed(tenantId: string, role: string = 'default'): Promise<{ allowed: boolean; retryAfter?: number }> {
    this.maybeCleanup();

    const key = `${tenantId}:${role}`;
    const config = this.roleLimits.get(role) ?? this.roleLimits.get('default')!;

    const now = this.clock.now().getTime();

    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = {
        tokens: config.burstSize,
        lastRefill: now,
        capacity: config.burstSize,
      };
      this.buckets.set(key, bucket);
    }

    // Refill tokens based on time elapsed
    const elapsedMs = now - bucket.lastRefill;
    const tokensToAdd = (elapsedMs / 1000) * config.requestsPerSecond;
    bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return { allowed: true };
    }

    // Calculate retry after
    const tokensNeeded = 1 - bucket.tokens;
    const retryAfterMs = (tokensNeeded / config.requestsPerSecond) * 1000;

    this.logger.warn(`Rate limit exceeded for ${key}`);
    return {
      allowed: false,
      retryAfter: Math.ceil(retryAfterMs / 1000),
    };
  }

  /**
   * Update role limits dynamically
   */
  setRoleLimit(role: string, config: RateLimitConfig): void {
    this.roleLimits.set(role, config);
  }

  /**
   * Get current bucket state (for debugging)
   */
  getBucketState(tenantId: string, role: string = 'default'): TokenBucket | undefined {
    return this.buckets.get(`${tenantId}:${role}`);
  }

  /**
   * Cleanup stale buckets
   */
  private cleanup(): void {
    const now = this.clock.now().getTime();
    const maxAge = 10 * 60 * 1000; // 10 minutes

    for (const [key, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefill > maxAge) {
        this.buckets.delete(key);
      }
    }
  }
}
