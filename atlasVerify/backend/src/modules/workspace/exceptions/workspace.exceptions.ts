import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class WorkspaceAccessDeniedException extends AtlasException {
  constructor() {
    super({
      message: 'You do not have permission to perform this action on this workspace',
      errorCode: ErrorCode.WORKSPACE_ACCESS_DENIED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class WorkspaceSuspendedException extends AtlasException {
  constructor() {
    super({
      message: 'This workspace is suspended',
      errorCode: ErrorCode.WORKSPACE_SUSPENDED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class WorkspaceInvalidStateTransitionException extends AtlasException {
  constructor(from: string, to: string) {
    super({
      message: `Cannot transition workspace from '${from}' to '${to}'`,
      errorCode: ErrorCode.WORKSPACE_INVALID_STATE_TRANSITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class WorkspaceOwnerRequiredException extends AtlasException {
  constructor() {
    super({
      message: 'This operation requires the workspace owner',
      errorCode: ErrorCode.WORKSPACE_OWNER_REQUIRED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class WorkspaceCannotRemoveOwnerException extends AtlasException {
  constructor() {
    super({
      message: 'The workspace owner cannot be removed or demoted — transfer ownership first',
      errorCode: ErrorCode.WORKSPACE_CANNOT_REMOVE_OWNER,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class WorkspaceMemberNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Workspace member '${id}' not found`,
      errorCode: ErrorCode.WORKSPACE_MEMBER_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class WorkspaceMemberAlreadyExistsException extends AtlasException {
  constructor(userId: string) {
    super({
      message: `User '${userId}' is already a member of this workspace`,
      errorCode: ErrorCode.WORKSPACE_MEMBER_ALREADY_EXISTS,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class WorkspaceNotAMemberException extends AtlasException {
  constructor() {
    super({
      message: 'You are not a member of this workspace',
      errorCode: ErrorCode.WORKSPACE_NOT_A_MEMBER,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class WorkspaceInvitationNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Workspace invitation '${id}' not found`,
      errorCode: ErrorCode.WORKSPACE_INVITATION_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class WorkspaceInvitationAlreadyExistsException extends AtlasException {
  constructor(email: string) {
    super({
      message: `A pending invitation already exists for '${email}'`,
      errorCode: ErrorCode.WORKSPACE_INVITATION_ALREADY_EXISTS,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class WorkspaceInvitationExpiredException extends AtlasException {
  constructor() {
    super({
      message: 'This invitation has expired',
      errorCode: ErrorCode.WORKSPACE_INVITATION_EXPIRED,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class WorkspaceInvitationInvalidStateException extends AtlasException {
  constructor(status: string) {
    super({
      message: `Invitation is '${status}' and can no longer be actioned`,
      errorCode: ErrorCode.WORKSPACE_INVITATION_INVALID_STATE,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class WorkspaceInvitationEmailMismatchException extends AtlasException {
  constructor() {
    super({
      message: 'This invitation was issued to a different email address',
      errorCode: ErrorCode.WORKSPACE_INVITATION_EMAIL_MISMATCH,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}
