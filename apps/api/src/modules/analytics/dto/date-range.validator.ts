import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from "class-validator";

@ValidatorConstraint({ name: "DateRange", async: false })
export class DateRangeValidator implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const obj = args.object as { from?: string; to?: string };
    const from = obj.from?.trim();
    const to = obj.to?.trim();

    if (!from || !to) return true; // Optional fields, skip if either missing

    const fromMs = Date.parse(from);
    const toMs = Date.parse(to);

    if (Number.isNaN(fromMs) || Number.isNaN(toMs)) return true; // Handled by @Matches

    if (fromMs > toMs) return false;
    const rangeDays = (toMs - fromMs) / (24 * 60 * 60 * 1000);
    if (rangeDays > 90) return false;

    return true;
  }

  defaultMessage(args: ValidationArguments): string {
    const obj = args.object as { from?: string; to?: string };
    const from = obj.from?.trim();
    const to = obj.to?.trim();
    if (!from || !to) return "Invalid date range";

    const fromMs = Date.parse(from);
    const toMs = Date.parse(to);
    if (fromMs > toMs) return "from must be before to";
    const rangeDays = (toMs - fromMs) / (24 * 60 * 60 * 1000);
    if (rangeDays > 90) return "Date range must not exceed 90 days";

    return "Invalid date range";
  }
}
