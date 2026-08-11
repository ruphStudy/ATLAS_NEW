import { Injectable } from '@nestjs/common';
import {
  ConnectionTestRequest,
  ConnectionTestValidationResult,
} from '../interfaces';

@Injectable()
export class ConnectionTestValidator {
  validate(request: ConnectionTestRequest): ConnectionTestValidationResult {
    const errors: string[] = [];

    if (!request.workspaceId || !request.workspaceId.trim()) {
      errors.push('workspaceId is required');
    }
    if (!request.providerKey || !request.providerKey.trim()) {
      errors.push('providerKey is required');
    }
    if (request.timeoutMs != null) {
      if (request.timeoutMs < 1_000) {
        errors.push('timeoutMs must be at least 1000ms');
      }
      if (request.timeoutMs > 60_000) {
        errors.push('timeoutMs cannot exceed 60000ms');
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
