import { IsOptional, IsString, Matches } from "class-validator";

const ISO_8601_REGEX =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/;

export class AnalyticsQueryDto {
  @IsOptional()
  @IsString()
  @Matches(ISO_8601_REGEX, {
    message: "from must be UTC ISO 8601 format (e.g. 2026-02-12T00:00:00Z)",
  })
  from?: string;

  @IsOptional()
  @IsString()
  @Matches(ISO_8601_REGEX, {
    message: "to must be UTC ISO 8601 format (e.g. 2026-02-19T23:59:59Z)",
  })
  to?: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  agentId?: string;
}
