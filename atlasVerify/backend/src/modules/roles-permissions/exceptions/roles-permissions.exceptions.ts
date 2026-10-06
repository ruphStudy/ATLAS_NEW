import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class RoleNotFoundException extends AtlasException {
  constructor(idOrKey: string) {
    super({
      message: `Role '${idOrKey}' not found`,
      errorCode: ErrorCode.ROLE_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class RoleAlreadyExistsException extends AtlasException {
  constructor(key: string) {
    super({
      message: `Role '${key}' already exists in this scope`,
      errorCode: ErrorCode.ROLE_ALREADY_EXISTS,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class RoleIsSystemRoleException extends AtlasException {
  constructor(key: string) {
    super({
      message: `Role '${key}' is a system role and cannot be modified or deleted`,
      errorCode: ErrorCode.ROLE_IS_SYSTEM_ROLE,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class RoleInvalidHierarchyException extends AtlasException {
  constructor(reason: string) {
    super({
      message: `Invalid role hierarchy: ${reason}`,
      errorCode: ErrorCode.ROLE_INVALID_HIERARCHY,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class RoleInUseException extends AtlasException {
  constructor(key: string) {
    super({
      message: `Role '${key}' has active assignments and cannot be archived`,
      errorCode: ErrorCode.ROLE_IN_USE,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class PermissionNotFoundException extends AtlasException {
  constructor(key: string) {
    super({
      message: `Permission '${key}' not found`,
      errorCode: ErrorCode.PERMISSION_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class PermissionAlreadyExistsException extends AtlasException {
  constructor(key: string) {
    super({
      message: `Permission '${key}' already exists`,
      errorCode: ErrorCode.PERMISSION_ALREADY_EXISTS,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class PermissionDeniedException extends AtlasException {
  constructor(action: string, resource: string) {
    super({
      message: `You do not have permission to ${action} ${resource}`,
      errorCode: ErrorCode.PERMISSION_DENIED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class PrivilegeEscalationDeniedException extends AtlasException {
  constructor() {
    super({
      message: 'You cannot grant or assign permissions beyond your own authority',
      errorCode: ErrorCode.PRIVILEGE_ESCALATION_DENIED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class RoleAssignmentNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Role assignment '${id}' not found`,
      errorCode: ErrorCode.ROLE_ASSIGNMENT_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class RoleAssignmentAlreadyExistsException extends AtlasException {
  constructor() {
    super({
      message: 'An active assignment of this role already exists for this principal and scope',
      errorCode: ErrorCode.ROLE_ASSIGNMENT_ALREADY_EXISTS,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class RoleAssignmentInvalidStateTransitionException extends AtlasException {
  constructor(from: string, to: string) {
    super({
      message: `Cannot transition role assignment from '${from}' to '${to}'`,
      errorCode: ErrorCode.ROLE_ASSIGNMENT_INVALID_STATE_TRANSITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class RoleAssignmentInvalidScopeException extends AtlasException {
  constructor(scopeType: string) {
    super({
      message: `A scopeId is required when assigning a role at '${scopeType}' scope`,
      errorCode: ErrorCode.ROLE_ASSIGNMENT_INVALID_SCOPE,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}
