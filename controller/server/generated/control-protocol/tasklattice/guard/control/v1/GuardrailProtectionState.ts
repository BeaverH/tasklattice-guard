// Original file: runner_control.proto

import type { Long } from '@grpc/proto-loader';

/**
 * Independent operating overlay: applying an emergency mode must not wait for
 * model credentials, Artifact compilation or prewarming. Versions stay immutable.
 */
export interface GuardrailProtectionState {
  /**
   * Monotonic Controller generation for this complete map, independent of Artifact application.
   */
  'generation'?: (number | string | Long);
  /**
   * Complete resource-level map. Missing entries use enforce.
   */
  'modes'?: ({[key: string]: string});
}

/**
 * Independent operating overlay: applying an emergency mode must not wait for
 * model credentials, Artifact compilation or prewarming. Versions stay immutable.
 */
export interface GuardrailProtectionState__Output {
  /**
   * Monotonic Controller generation for this complete map, independent of Artifact application.
   */
  'generation': (string);
  /**
   * Complete resource-level map. Missing entries use enforce.
   */
  'modes': ({[key: string]: string});
}
