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
  /**
   * Parses an ISO-8601 timestamp string to Date.
   * Use this instead of new Date(str) for governance compliance.
   */
  parseISO(iso: string): Date;
  /**
   * Schedules a callback after ms milliseconds.
   * Use this instead of global setTimeout for governance compliance.
   */
  setTimeout(cb: () => void, ms: number): ReturnType<typeof setTimeout>;
}

/**
 * System clock implementation using real system time.
 */
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
  parseISO(iso: string): Date {
    return new Date(iso);
  }
  setTimeout(cb: () => void, ms: number): ReturnType<typeof setTimeout> {
    return setTimeout(cb, ms);
  }
}

/**
 * Fake clock implementation for testing.
 * Allows setting a specific time.
 */
export class FakeClock implements Clock {
  private currentTime: Date;
  private pendingTimeouts: Array<{ id: number; cb: () => void; ms: number }> = [];
  private nextId = 1;

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

  parseISO(iso: string): Date {
    return new Date(iso);
  }

  setTimeout(cb: () => void, ms: number): ReturnType<typeof setTimeout> {
    const id = this.nextId++;
    this.pendingTimeouts.push({ id, cb, ms });
    return id as unknown as ReturnType<typeof setTimeout>;
  }
}

