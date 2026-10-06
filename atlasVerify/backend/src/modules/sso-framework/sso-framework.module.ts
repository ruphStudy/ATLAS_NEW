import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { QUEUE_NAMES } from '@common/constants';
import { AuthenticationModule } from '@modules/authentication/authentication.module';
import { UsersModule } from '@modules/users/users.module';
import { RolesPermissionsModule } from '@modules/roles-permissions/roles-permissions.module';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
import { TenantIsolationModule } from '@modules/tenant-isolation/tenant-isolation.module';
import { SsoFrameworkController } from './sso-framework.controller';
import { SsoFrameworkService } from './sso-framework.service';
import { SsoFrameworkRepository } from './sso-framework.repository';
import { SsoCredentialEncryptor } from './sso-credential.encryptor';
import { SsoCredentialDecryptor } from './sso-credential.decryptor';
import { OidcTokenValidatorService } from './validators/oidc-token-validator.service';
import { SsoFrameworkEventQueue, SsoFrameworkEventWorker } from './jobs';

/**
 * SsoFrameworkModule — generic SAML 2.0 / OIDC Service-Provider framework
 * for enterprise sign-in INTO ATLAS, distinct from `oauth-management`
 * (ATLAS connecting OUT to third-party APIs) and from `authentication`'s
 * own password-based login. Delegates ALL session/token minting to
 * `AuthenticationService.issueTokensForWorkspace()` — this module never
 * signs a JWT itself — and delegates role-mapping grants to
 * `RolesPermissionsService.assignRole()`, so RBAC stays centralized.
 * Certificates/client secrets are AES-256-GCM encrypted and never logged;
 * SAML/OIDC signature verification uses Node's built-in `crypto` only
 * (no new dependency), isolated in `validators/` per-protocol so IdP-
 * specific parsing never leaks into the generic connection/provisioning
 * logic.
 */
@Module({
  imports: [
    DatabaseModule,
    AuthenticationModule,
    UsersModule,
    RolesPermissionsModule,
    AuditLogsModule,
    TenantIsolationModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.SSO_FRAMEWORK_EVENTS,
    }),
  ],
  controllers: [SsoFrameworkController],
  providers: [
    SsoFrameworkService,
    SsoFrameworkRepository,
    SsoCredentialEncryptor,
    SsoCredentialDecryptor,
    OidcTokenValidatorService,
    SsoFrameworkEventQueue,
    SsoFrameworkEventWorker,
  ],
  exports: [SsoFrameworkService],
})
export class SsoFrameworkModule {}
