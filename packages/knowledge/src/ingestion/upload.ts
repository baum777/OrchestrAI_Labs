import type { Clock } from "@agent-system/governance-v2/runtime/clock";
import { SystemClock } from "@agent-system/governance-v2/runtime/clock";

export async function uploadDocument(
  source: string,
  content: string,
  clock: Clock = new SystemClock()
): Promise<string> {
  console.log(`Uploading document from ${source}`);
  return `doc-${clock.now().getTime()}`;
}

