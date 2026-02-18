/**
 * Clock Abstraction
 * 
 * Provides time abstraction for deterministic, testable time handling.
 * Source of truth: UTC ISO-8601 via Date.toISOString().
 */

export interface Clock {
  /**
   * Returns the current time as a Date object.
   * Always returns UTC time.
   */
  now(): Date;
}

/**
 * System clock implementation using real system time.
 */
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

/**
 * Fake clock implementation for testing.
 * Allows setting a specific time.
 */
export class FakeClock implements Clock {
  private currentTime: Date;

  constructor(initialTime?: Date) {
    this.currentTime = initialTime ?? new Date();
  }

  /**
   * Sets the current time for the fake clock.
   */
  set(date: Date): void {
    this.currentTime = new Date(date);
  }

  /**
   * Advances the clock by the specified number of milliseconds.
   */
  advance(ms: number): void {
    this.currentTime = new Date(this.currentTime.getTime() + ms);
  }

  now(): Date {
    return new Date(this.currentTime);
  }
}

