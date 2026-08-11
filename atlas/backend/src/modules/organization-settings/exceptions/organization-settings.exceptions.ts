import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class OrganizationSettingNotFoundException extends AtlasException {
  constructor(key: string) {
    super({
      message: `Organization setting '${key}' is not a recognized organization-settings key`,
      errorCode: ErrorCode.ORGANIZATION_SETTING_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class OrganizationSettingNotConfiguredException extends AtlasException {
  constructor(key: string) {
    super({
      message: `Organization setting '${key}' has no configured value for this scope yet`,
      errorCode: ErrorCode.ORGANIZATION_SETTING_NOT_CONFIGURED,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}
