/**
 * Minimal Clock interface for PolicyEngine timestamps.
 * Avoids governance-v2 dependency for governance package.
 */
export interface Clock {
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
 * Allows setting a specific time for deterministic tests.
 */
export class FakeClock implements Clock {
  private currentTime: Date;
  private pendingTimeouts: Array<{ id: number; cb: () => void; ms: number }> = [];
  private nextId = 1;

  constructor(initialTime?: Date | number) {
    this.currentTime = initialTime !== undefined ? new Date(initialTime) : new Date();
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
