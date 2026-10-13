// Original file: runner_control.proto

import type { Long } from '@grpc/proto-loader';

/**
 * ACK/NACK for a persisted operating-mode snapshot on the registered Runner stream.
 */
export interface GuardrailProtectionResult {
  'runnerId'?: (string);
  /**
   * Echo the exact dispatched protection generation; stale results never supersede newer ones.
   */
  'generation'?: (number | string | Long);
  /**
   * True only after the entire map has been validated, persisted and atomically applied.
   */
  'accepted'?: (boolean);
  /**
   * Diagnostic for a NACK; empty on ACK. Never include credentials or request content.
   */
  'reason'?: (string);
}

/**
 * ACK/NACK for a persisted operating-mode snapshot on the registered Runner stream.
 */
export interface GuardrailProtectionResult__Output {
  'runnerId': (string);
  /**
   * Echo the exact dispatched protection generation; stale results never supersede newer ones.
   */
  'generation': (string);
  /**
   * True only after the entire map has been validated, persisted and atomically applied.
   */
  'accepted': (boolean);
  /**
   * Diagnostic for a NACK; empty on ACK. Never include credentials or request content.
   */
  'reason': (string);
}
