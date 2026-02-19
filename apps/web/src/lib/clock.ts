/**
 * Client-safe clock instance.
 * Uses SystemClock from governance-v2 for Clock compliance.
 */
import { SystemClock } from "@agent-system/governance-v2/runtime/clock";

export const clock = new SystemClock();
