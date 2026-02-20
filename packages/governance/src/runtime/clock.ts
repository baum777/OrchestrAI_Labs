/**
 * Minimal Clock interface for PolicyEngine timestamps.
 * Avoids governance-v2 dependency for governance package.
 */
export interface Clock {
  now(): Date;
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
