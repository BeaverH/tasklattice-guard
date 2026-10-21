// Original file: validation.proto


/**
 * A model-dependent Rule excluded from this test run, not from publication.
 */
export interface ValidationSkippedRule {
  'policyId'?: (string);
  'ruleId'?: (string);
  /**
   * Human-readable explanation of why this Rule was excluded from execution.
   */
  'reason'?: (string);
}

/**
 * A model-dependent Rule excluded from this test run, not from publication.
 */
export interface ValidationSkippedRule__Output {
  'policyId': (string);
  'ruleId': (string);
  /**
   * Human-readable explanation of why this Rule was excluded from execution.
   */
  'reason': (string);
}
