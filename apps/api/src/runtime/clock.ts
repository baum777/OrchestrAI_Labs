/**
 * Clock Abstraction Re-export
 *
 * Re-exports clock abstraction from governance-v2 for apps/api usage.
 * Ensures consistent time handling across the API layer.
 */

export {
  Clock,
  SystemClock,
  FakeClock,
} from '../../../../packages/governance-v2/src/runtime/clock';
