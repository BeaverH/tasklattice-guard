// Original file: model.proto

import type { DataPlaneModelConfiguration as _tasklattice_guard_control_v1_DataPlaneModelConfiguration, DataPlaneModelConfiguration__Output as _tasklattice_guard_control_v1_DataPlaneModelConfiguration__Output } from '../../../../tasklattice/guard/control/v1/DataPlaneModelConfiguration.js';
import type { FormalValidationContext as _tasklattice_guard_control_v1_FormalValidationContext, FormalValidationContext__Output as _tasklattice_guard_control_v1_FormalValidationContext__Output } from '../../../../tasklattice/guard/control/v1/FormalValidationContext.js';

/**
 * Isolated, non-activating verification of one proposed Input/Output binding.
 * The lease is short-lived and scoped to exactly the candidate's credential refs.
 */
export interface CapabilityValidationRequest {
  'requestId'?: (string);
  'bindingId'?: (string);
  'configuration'?: (_tasklattice_guard_control_v1_DataPlaneModelConfiguration | null);
  'credentialLeaseId'?: (string);
  'formalValidation'?: (_tasklattice_guard_control_v1_FormalValidationContext | null);
}

/**
 * Isolated, non-activating verification of one proposed Input/Output binding.
 * The lease is short-lived and scoped to exactly the candidate's credential refs.
 */
export interface CapabilityValidationRequest__Output {
  'requestId': (string);
  'bindingId': (string);
  'configuration': (_tasklattice_guard_control_v1_DataPlaneModelConfiguration__Output | null);
  'credentialLeaseId': (string);
  'formalValidation': (_tasklattice_guard_control_v1_FormalValidationContext__Output | null);
}
