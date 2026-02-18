import { Controller, Get, Query } from "@nestjs/common";
import { MonitoringService } from "./monitoring.service";
import { SystemClock } from "@agent-system/governance-v2/runtime/clock";

@Controller("monitoring")
export class MonitoringController {
  private readonly clock = new SystemClock();

  constructor(private readonly monitoring: MonitoringService) {}

  @Get("drift")
  async getDrift(
    @Query("from") from?: string,
    @Query("to") to?: string
  ): Promise<{
    range: { from: string; to: string };
    metrics: Awaited<ReturnType<MonitoringService["getDriftMetrics"]>>;
  }> {
    // Default: last 30 days
    const now = this.clock.now();
    const toDate = to ? new Date(to) : now;
    const fromDate = from
      ? new Date(from)
      : new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const metrics = await this.monitoring.getDriftMetrics(
      fromDate.toISOString(),
      toDate.toISOString()
    );

    return {
      range: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
      },
      metrics,
    };
  }
}

