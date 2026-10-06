import { Injectable, Logger } from '@nestjs/common';
import { AccountStatus, IMarketplaceAccount } from '../interfaces';
import { MP_ACCOUNT_CONSTANTS, MP_ACCOUNT_ERROR_CODES } from '../constants';

@Injectable()
export class AccountStatusManager {
  private readonly logger = new Logger(AccountStatusManager.name);

  canTransition(from: AccountStatus, to: AccountStatus): boolean {
    const allowed = MP_ACCOUNT_CONSTANTS.ALLOWED_TRANSITIONS[from];
    return allowed?.includes(to) ?? false;
  }

  assertTransition(from: AccountStatus, to: AccountStatus): void {
    if (!this.canTransition(from, to)) {
      throw Object.assign(
        new Error(`Cannot transition account from '${from}' to '${to}'`),
        { code: MP_ACCOUNT_ERROR_CODES.INVALID_TRANSITION, from, to },
      );
    }
  }

  isMutable(status: AccountStatus): boolean {
    return (MP_ACCOUNT_CONSTANTS.MUTABLE_STATUSES as AccountStatus[]).includes(status);
  }

  isActive(status: AccountStatus): boolean {
    return (MP_ACCOUNT_CONSTANTS.ACTIVE_STATUSES as AccountStatus[]).includes(status);
  }

  assertMutable(account: IMarketplaceAccount): void {
    if (!this.isMutable(account.status)) {
      throw Object.assign(
        new Error(`Account '${account.id}' with status '${account.status}' cannot be modified`),
        { code: MP_ACCOUNT_ERROR_CODES.IMMUTABLE_STATUS },
      );
    }
  }
}
