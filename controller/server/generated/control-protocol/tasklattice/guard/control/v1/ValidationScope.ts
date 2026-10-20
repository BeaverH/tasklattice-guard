// Original file: validation.proto

import type { ValidationSkippedRule as _tasklattice_guard_control_v1_ValidationSkippedRule, ValidationSkippedRule__Output as _tasklattice_guard_control_v1_ValidationSkippedRule__Output } from '../../../../tasklattice/guard/control/v1/ValidationSkippedRule.js';

export interface ValidationScope {
  'testModelRules'?: (boolean);
  'skippedRules'?: (_tasklattice_guard_control_v1_ValidationSkippedRule)[];
  'modelInvocations'?: (number);
  'executionDigest'?: (string);
  /**
   * Full publication Artifact successfully loaded without invoking its models.
   */
  'fullArtifactLoaded'?: (boolean);
}

export interface ValidationScope__Output {
  'testModelRules': (boolean);
  'skippedRules': (_tasklattice_guard_control_v1_ValidationSkippedRule__Output)[];
  'modelInvocations': (number);
  'executionDigest': (string);
  /**
   * Full publication Artifact successfully loaded without invoking its models.
   */
  'fullArtifactLoaded': (boolean);
}
