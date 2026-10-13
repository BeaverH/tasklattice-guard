// Original file: model.proto


/**
 * Synthetic examples tied to an existing, versioned external proof policy.
 */
export interface FormalValidationContext {
  'policyId'?: (string);
  'policyVersion'?: (string);
  'confidenceThreshold'?: (number | string);
  'query'?: (string);
  'validResponse'?: (string);
  'invalidResponse'?: (string);
}

/**
 * Synthetic examples tied to an existing, versioned external proof policy.
 */
export interface FormalValidationContext__Output {
  'policyId': (string);
  'policyVersion': (string);
  'confidenceThreshold': (number);
  'query': (string);
  'validResponse': (string);
  'invalidResponse': (string);
}
