export { ErrorCode } from './error-codes.enum';
export {
  AtlasException,
  ResourceNotFoundException,
  DuplicateResourceException,
  InsufficientPermissionsException,
  WorkspaceAccessDeniedException,
  BusinessRuleException,
  statusToErrorCode,
} from './atlas.exception';
export type { AtlasExceptionOptions } from './atlas.exception';
