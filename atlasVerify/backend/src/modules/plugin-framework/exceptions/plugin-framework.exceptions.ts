import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class PluginManifestNotFoundException extends AtlasException {
  constructor(appKey: string, versionId: string) {
    super({
      message: `Plugin manifest for app '${appKey}' version '${versionId}' not found`,
      errorCode: ErrorCode.PLUGIN_MANIFEST_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class PluginManifestAlreadyRegisteredException extends AtlasException {
  constructor(appKey: string, versionId: string) {
    super({
      message: `A plugin manifest for app '${appKey}' version '${versionId}' is already registered`,
      errorCode: ErrorCode.PLUGIN_MANIFEST_ALREADY_REGISTERED,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class PluginManifestInvalidException extends AtlasException {
  constructor(reason: string) {
    super({
      message: reason,
      errorCode: ErrorCode.PLUGIN_MANIFEST_INVALID,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class PluginActivationNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Plugin activation '${id}' not found`,
      errorCode: ErrorCode.PLUGIN_ACTIVATION_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class PluginAlreadyActivatedException extends AtlasException {
  constructor(appKey: string) {
    super({
      message: `App '${appKey}' is already activated for this tenant`,
      errorCode: ErrorCode.PLUGIN_ALREADY_ACTIVATED,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class PluginNotActivatedException extends AtlasException {
  constructor(appKey: string) {
    super({
      message: `App '${appKey}' is not active for this tenant`,
      errorCode: ErrorCode.PLUGIN_NOT_ACTIVATED,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class PluginIncompatibleException extends AtlasException {
  constructor(reason: string) {
    super({
      message: reason,
      errorCode: ErrorCode.PLUGIN_INCOMPATIBLE,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class PluginPermissionNotGrantedException extends AtlasException {
  constructor(permissions: string[]) {
    super({
      message: `Permission(s) not declared by the plugin manifest: ${permissions.join(', ')}`,
      errorCode: ErrorCode.PLUGIN_PERMISSION_NOT_GRANTED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class PluginQuarantinedException extends AtlasException {
  constructor(appKey: string, reason: string | null) {
    super({
      message: `App '${appKey}' is quarantined${reason ? `: ${reason}` : ''}`,
      errorCode: ErrorCode.PLUGIN_QUARANTINED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class PluginExtensionPointNotFoundException extends AtlasException {
  constructor(appKey: string, extensionPointKey: string) {
    super({
      message: `Extension point '${extensionPointKey}' for app '${appKey}' not found`,
      errorCode: ErrorCode.PLUGIN_EXTENSION_POINT_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class PluginExtensionPointAlreadyRegisteredException extends AtlasException {
  constructor(appKey: string, extensionPointKey: string) {
    super({
      message: `Extension point '${extensionPointKey}' is already registered for app '${appKey}'`,
      errorCode: ErrorCode.PLUGIN_EXTENSION_POINT_ALREADY_REGISTERED,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class PluginSubscriptionNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Plugin event subscription '${id}' not found`,
      errorCode: ErrorCode.PLUGIN_SUBSCRIPTION_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class PluginHookNotDeclaredException extends AtlasException {
  constructor(appKey: string, hookName: string) {
    super({
      message: `Hook '${hookName}' is not declared in app '${appKey}''s manifest`,
      errorCode: ErrorCode.PLUGIN_HOOK_NOT_DECLARED,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class PluginAccessDeniedException extends AtlasException {
  constructor() {
    super({
      message: 'You do not have permission to perform this plugin framework operation',
      errorCode: ErrorCode.PLUGIN_ACCESS_DENIED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}
