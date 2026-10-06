import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { API } from '@common/constants';
import { AuthenticationService } from '@modules/authentication/authentication.service';
import { UsersRepository } from '@modules/users/users.repository';
import { RolesPermissionsService } from '@modules/roles-permissions/roles-permissions.service';
import { PrincipalType } from '@modules/roles-permissions/interfaces';
import { AssignRoleDto } from '@modules/roles-permissions/dto';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { ActivityActorType, ActivityOutcome, AuditActionCategory, AuditRiskLevel } from '@modules/audit-logs/interfaces';
import { SsoFrameworkRepository } from './sso-framework.repository';
import { SsoCredentialEncryptor } from './sso-credential.encryptor';
import { SsoCredentialDecryptor } from './sso-credential.decryptor';
import { SsoFrameworkEventQueue } from './jobs';
import { generateNonce, generateState } from './sso-crypto.util';
import { buildSsoScopeKey } from './scope-key.util';
import { buildSamlAuthnRequestUrl, parseAndVerifySamlResponse } from './validators/saml-assertion.util';
import { OidcTokenValidatorService } from './validators/oidc-token-validator.service';
import {
  RegisterSsoConnectionDto,
  UpdateSsoConnectionDto,
  SsoConnectionFilterDto,
  RotateCertificateDto,
  RotateSsoClientSecretDto,
  CreateGroupRoleMappingDto,
  UpdateGroupRoleMappingDto,
  SamlCallbackDto,
  OidcSsoCallbackDto,
  SsoReasonDto,
  PaginatedSsoConnectionResponseDto,
} from './dto';
import {
  SsoChangeType,
  SsoConnectionStatus,
  SsoFrameworkEvent,
  SsoLoginRequestStatus,
  SsoProtocol,
  SsoScopeType,
  ISsoConnection,
  ISsoGroupRoleMapping,
  ISsoHistory,
  ISsoIdentity,
  ISsoInitiateLoginResult,
  ISsoLoginRequest,
  ISsoLoginResult,
  ISsoLogoutResult,
  ISsoNormalizedIdentity,
} from './interfaces';
import { LOGIN_REQUEST_TTL_MS, SSO_FRAMEWORK_MODULE, SSO_JIT_ACTING_ROLE, SSO_MANAGE_ROLES, SSO_REQUEST_TIMEOUT_MS } from './constants';
import {
  SsoAccessDeniedException,
  SsoAssertionInvalidException,
  SsoConnectionAlreadyExistsException,
  SsoConnectionInactiveException,
  SsoConnectionInvalidDefinitionException,
  SsoConnectionInvalidStateTransitionException,
  SsoConnectionNotFoundException,
  SsoDomainAlreadyRegisteredException,
  SsoDomainNotRoutableException,
  SsoIdentityAlreadyLinkedException,
  SsoLoginRequestExpiredException,
  SsoLoginRequestInvalidStateException,
  SsoLoginRequestNotFoundException,
  SsoProvisioningDisabledException,
} from './exceptions/sso-framework.exceptions';

const CONNECTION_TRANSITIONS: Record<SsoConnectionStatus, SsoConnectionStatus[]> = {
  [SsoConnectionStatus.ACTIVE]: [SsoConnectionStatus.DISABLED, SsoConnectionStatus.REVOKED, SsoConnectionStatus.ARCHIVED],
  [SsoConnectionStatus.DISABLED]: [SsoConnectionStatus.ACTIVE, SsoConnectionStatus.REVOKED, SsoConnectionStatus.ARCHIVED],
  [SsoConnectionStatus.REVOKED]: [SsoConnectionStatus.ARCHIVED],
  [SsoConnectionStatus.ARCHIVED]: [],
};

const JIT_PASSWORD_HASH_ROUNDS = 12;

@Injectable()
export class SsoFrameworkService {
  private readonly logger = new Logger(SsoFrameworkService.name);

  constructor(
    private readonly repository: SsoFrameworkRepository,
    private readonly encryptor: SsoCredentialEncryptor,
    private readonly decryptor: SsoCredentialDecryptor,
    private readonly oidcValidator: OidcTokenValidatorService,
    private readonly authenticationService: AuthenticationService,
    private readonly usersRepository: UsersRepository,
    private readonly rolesPermissionsService: RolesPermissionsService,
    private readonly auditLogsService: AuditLogsService,
    private readonly eventQueue: SsoFrameworkEventQueue,
  ) {}

  // ══════════════════════════════════════════════════════════════════
  // Connections
  // ══════════════════════════════════════════════════════════════════

  async registerConnection(workspaceId: string, userId: string, userRole: string, dto: RegisterSsoConnectionDto): Promise<ISsoConnection> {
    await this.assertCanManage(workspaceId, userId, userRole);
    this.assertValidDefinition(dto.protocol, dto);
    await this.assertDomainsAvailable(dto.domains);

    const scopeKey = buildSsoScopeKey({ scopeType: dto.scopeType, workspaceId, organizationId: dto.organizationId });

    const existing = await this.repository.findConnectionByScopeKeyAndName(scopeKey, dto.name);
    if (existing) {
      throw new SsoConnectionAlreadyExistsException(dto.name);
    }

    const connection = await this.repository.createConnection({
      workspaceId: dto.scopeType === SsoScopeType.ORGANIZATION ? null : workspaceId,
      organizationId: dto.organizationId ?? null,
      scopeType: dto.scopeType,
      scopeKey,
      name: dto.name,
      description: dto.description ?? null,
      protocol: dto.protocol,
      status: SsoConnectionStatus.ACTIVE,
      domains: dto.domains,
      scopes: dto.scopes ?? [],
      issuer: dto.issuer ?? null,
      entityId: dto.entityId ?? null,
      clientId: dto.clientId ?? null,
      metadataUrl: dto.metadataUrl ?? null,
      ssoUrl: dto.ssoUrl ?? null,
      sloUrl: dto.sloUrl ?? null,
      authorizationEndpoint: dto.authorizationEndpoint ?? null,
      tokenEndpoint: dto.tokenEndpoint ?? null,
      jwksUri: dto.jwksUri ?? null,
      userInfoEndpoint: dto.userInfoEndpoint ?? null,
      endSessionEndpoint: dto.endSessionEndpoint ?? null,
      encryptedCertificate: dto.certificate ? this.encryptor.encryptValue(dto.certificate, scopeKey) : null,
      encryptedClientSecret: dto.clientSecret ? this.encryptor.encryptValue(dto.clientSecret, scopeKey) : null,
      jitProvisioningEnabled: dto.jitProvisioningEnabled ?? true,
      groupClaimName: dto.groupClaimName ?? null,
      defaultRoleId: dto.defaultRoleId ?? null,
      createdBy: userId,
    });

    await this.recordHistory(connection.id, connection.workspaceId, SsoChangeType.CONNECTION_REGISTERED, null, SsoConnectionStatus.ACTIVE, userId, this.sanitizeForHistory(connection));
    await this.recordAudit(workspaceId, userId, 'sso-framework.connection.registered', AuditActionCategory.CREATE, connection.id);
    await this.publishEvent(SsoFrameworkEvent.SSO_CONNECTION_REGISTERED, connection, userId);

    return connection;
  }

  async updateConnection(id: string, workspaceId: string, userId: string, userRole: string, dto: UpdateSsoConnectionDto): Promise<ISsoConnection> {
    const connection = await this.getVisibleConnectionOrThrow(id, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);

    if (dto.domains) {
      await this.assertDomainsAvailable(dto.domains, id);
    }

    const updated = await this.repository.updateConnection(id, {
      name: dto.name ?? connection.name,
      description: dto.description ?? connection.description,
      domains: dto.domains ?? connection.domains,
      scopes: dto.scopes ?? connection.scopes,
      enforcementPolicy: dto.enforcementPolicy ?? connection.enforcementPolicy,
      issuer: dto.issuer ?? connection.issuer,
      entityId: dto.entityId ?? connection.entityId,
      metadataUrl: dto.metadataUrl ?? connection.metadataUrl,
      ssoUrl: dto.ssoUrl ?? connection.ssoUrl,
      sloUrl: dto.sloUrl ?? connection.sloUrl,
      authorizationEndpoint: dto.authorizationEndpoint ?? connection.authorizationEndpoint,
      tokenEndpoint: dto.tokenEndpoint ?? connection.tokenEndpoint,
      jwksUri: dto.jwksUri ?? connection.jwksUri,
      userInfoEndpoint: dto.userInfoEndpoint ?? connection.userInfoEndpoint,
      endSessionEndpoint: dto.endSessionEndpoint ?? connection.endSessionEndpoint,
      jitProvisioningEnabled: dto.jitProvisioningEnabled ?? connection.jitProvisioningEnabled,
      groupClaimName: dto.groupClaimName ?? connection.groupClaimName,
      defaultRoleId: dto.defaultRoleId ?? connection.defaultRoleId,
    });

    await this.recordHistory(id, connection.workspaceId, SsoChangeType.CONNECTION_UPDATED, null, null, userId, this.sanitizeForHistory(updated));
    await this.recordAudit(workspaceId, userId, 'sso-framework.connection.updated', AuditActionCategory.UPDATE, id);
    await this.publishEvent(SsoFrameworkEvent.SSO_CONNECTION_UPDATED, updated, userId);
    return updated;
  }

  async enableConnection(id: string, workspaceId: string, userId: string, userRole: string): Promise<ISsoConnection> {
    const connection = await this.getVisibleConnectionOrThrow(id, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);
    return this.transition(connection, SsoConnectionStatus.ACTIVE, userId, SsoChangeType.CONNECTION_ENABLED, SsoFrameworkEvent.SSO_CONNECTION_ENABLED);
  }

  async disableConnection(id: string, workspaceId: string, userId: string, userRole: string): Promise<ISsoConnection> {
    const connection = await this.getVisibleConnectionOrThrow(id, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);
    return this.transition(connection, SsoConnectionStatus.DISABLED, userId, SsoChangeType.CONNECTION_DISABLED, SsoFrameworkEvent.SSO_CONNECTION_DISABLED);
  }

  async revokeConnection(id: string, workspaceId: string, userId: string, userRole: string, dto: SsoReasonDto): Promise<ISsoConnection> {
    const connection = await this.getVisibleConnectionOrThrow(id, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);
    return this.transition(connection, SsoConnectionStatus.REVOKED, userId, SsoChangeType.CONNECTION_REVOKED, SsoFrameworkEvent.SSO_CONNECTION_REVOKED, dto.reason);
  }

  async archiveConnection(id: string, workspaceId: string, userId: string, userRole: string): Promise<ISsoConnection> {
    const connection = await this.getVisibleConnectionOrThrow(id, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);
    return this.transition(connection, SsoConnectionStatus.ARCHIVED, userId, SsoChangeType.CONNECTION_ARCHIVED, SsoFrameworkEvent.SSO_CONNECTION_ARCHIVED);
  }

  async rotateCertificate(id: string, workspaceId: string, userId: string, userRole: string, dto: RotateCertificateDto): Promise<ISsoConnection> {
    const connection = await this.getVisibleConnectionOrThrow(id, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);

    const encryptedCertificate = this.encryptor.encryptValue(dto.certificate, connection.scopeKey);
    const updated = await this.repository.updateConnection(id, { encryptedCertificate });

    await this.recordHistory(id, connection.workspaceId, SsoChangeType.CERTIFICATE_ROTATED, null, null, userId, this.sanitizeForHistory(updated));
    await this.recordAudit(workspaceId, userId, 'sso-framework.connection.certificate_rotated', AuditActionCategory.UPDATE, id, AuditRiskLevel.SUSPICIOUS);
    await this.publishEvent(SsoFrameworkEvent.SSO_CERTIFICATE_ROTATED, updated, userId);
    return updated;
  }

  async rotateClientSecret(id: string, workspaceId: string, userId: string, userRole: string, dto: RotateSsoClientSecretDto): Promise<ISsoConnection> {
    const connection = await this.getVisibleConnectionOrThrow(id, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);

    const encryptedClientSecret = this.encryptor.encryptValue(dto.clientSecret, connection.scopeKey);
    const updated = await this.repository.updateConnection(id, { encryptedClientSecret });

    await this.recordHistory(id, connection.workspaceId, SsoChangeType.CLIENT_SECRET_ROTATED, null, null, userId, this.sanitizeForHistory(updated));
    await this.recordAudit(workspaceId, userId, 'sso-framework.connection.client_secret_rotated', AuditActionCategory.UPDATE, id, AuditRiskLevel.SUSPICIOUS);
    await this.publishEvent(SsoFrameworkEvent.SSO_CLIENT_SECRET_ROTATED, updated, userId);
    return updated;
  }

  /** Best-effort — fetches and caches raw IdP metadata (SAML metadata XML / OIDC discovery JSON) for operator reference. Never throws; failures are logged and the connection is left unchanged. */
  async refreshMetadata(id: string, workspaceId: string, userId: string, userRole: string): Promise<ISsoConnection> {
    const connection = await this.getVisibleConnectionOrThrow(id, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);

    if (!connection.metadataUrl) {
      throw new SsoConnectionInvalidDefinitionException('This connection has no metadataUrl configured');
    }

    let metadataXml: string;
    try {
      const response = await axios.get(connection.metadataUrl, { timeout: SSO_REQUEST_TIMEOUT_MS, responseType: 'text' });
      metadataXml = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    } catch (error) {
      throw new SsoConnectionInvalidDefinitionException(`Failed to fetch metadata: ${(error as Error).message}`);
    }

    const updated = await this.repository.updateConnection(id, { metadataXml, metadataFetchedAt: new Date() });

    await this.recordHistory(id, connection.workspaceId, SsoChangeType.METADATA_REFRESHED, null, null, userId, this.sanitizeForHistory(updated));
    await this.recordAudit(workspaceId, userId, 'sso-framework.connection.metadata_refreshed', AuditActionCategory.UPDATE, id);
    await this.publishEvent(SsoFrameworkEvent.SSO_METADATA_REFRESHED, updated, userId);
    return updated;
  }

  async getConnection(id: string, workspaceId: string): Promise<ISsoConnection> {
    return this.getVisibleConnectionOrThrow(id, workspaceId);
  }

  async getConnectionHistory(id: string, workspaceId: string): Promise<ISsoHistory[]> {
    await this.getVisibleConnectionOrThrow(id, workspaceId);
    return this.repository.findHistory(id);
  }

  async findAllConnections(workspaceId: string, filter: SsoConnectionFilterDto): Promise<PaginatedSsoConnectionResponseDto> {
    const [data, total] = await this.repository.findAllConnections(workspaceId, filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ══════════════════════════════════════════════════════════════════
  // Group → role mappings
  // ══════════════════════════════════════════════════════════════════

  async createGroupRoleMapping(connectionId: string, workspaceId: string, userId: string, userRole: string, dto: CreateGroupRoleMappingDto): Promise<ISsoGroupRoleMapping> {
    await this.getVisibleConnectionOrThrow(connectionId, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);

    const existing = await this.repository.findGroupRoleMappingByConnectionAndGroup(connectionId, dto.externalGroup);
    if (existing) {
      throw new SsoConnectionInvalidDefinitionException(`A mapping for group '${dto.externalGroup}' already exists on this connection`);
    }

    return this.repository.createGroupRoleMapping({ connectionId, externalGroup: dto.externalGroup, roleId: dto.roleId, priority: dto.priority ?? 0 });
  }

  async updateGroupRoleMapping(connectionId: string, mappingId: string, workspaceId: string, userId: string, userRole: string, dto: UpdateGroupRoleMappingDto): Promise<ISsoGroupRoleMapping> {
    await this.getVisibleConnectionOrThrow(connectionId, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);

    const mapping = await this.repository.findGroupRoleMappingById(mappingId);
    if (!mapping || mapping.connectionId !== connectionId) {
      throw new SsoConnectionInvalidDefinitionException(`Group role mapping '${mappingId}' not found on this connection`);
    }

    return this.repository.updateGroupRoleMapping(mappingId, { roleId: dto.roleId ?? mapping.roleId, priority: dto.priority ?? mapping.priority });
  }

  async deleteGroupRoleMapping(connectionId: string, mappingId: string, workspaceId: string, userId: string, userRole: string): Promise<void> {
    await this.getVisibleConnectionOrThrow(connectionId, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);

    const mapping = await this.repository.findGroupRoleMappingById(mappingId);
    if (!mapping || mapping.connectionId !== connectionId) {
      throw new SsoConnectionInvalidDefinitionException(`Group role mapping '${mappingId}' not found on this connection`);
    }
    await this.repository.deleteGroupRoleMapping(mappingId);
  }

  async listGroupRoleMappings(connectionId: string, workspaceId: string): Promise<ISsoGroupRoleMapping[]> {
    await this.getVisibleConnectionOrThrow(connectionId, workspaceId);
    return this.repository.findGroupRoleMappingsByConnection(connectionId);
  }

  // ══════════════════════════════════════════════════════════════════
  // Login — domain discovery + initiation
  // ══════════════════════════════════════════════════════════════════

  /** Public, unauthenticated — home-realm discovery by email domain. */
  async discoverConnectionByEmail(email: string): Promise<{ connectionId: string; protocol: SsoProtocol }> {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) {
      throw new SsoDomainNotRoutableException(email);
    }
    const connection = await this.repository.findActiveConnectionByDomain(domain);
    if (!connection) {
      throw new SsoDomainNotRoutableException(domain);
    }
    return { connectionId: connection.id, protocol: connection.protocol };
  }

  async initiateLogin(connectionId: string): Promise<ISsoInitiateLoginResult> {
    const connection = await this.repository.findConnectionById(connectionId);
    if (!connection) {
      throw new SsoConnectionNotFoundException(connectionId);
    }
    this.assertConnectionActive(connection);

    const state = generateState();
    const nonce = generateNonce();
    const expiresAt = new Date(Date.now() + LOGIN_REQUEST_TTL_MS);

    await this.repository.createLoginRequest({
      connectionId: connection.id,
      workspaceId: connection.workspaceId,
      organizationId: connection.organizationId,
      state,
      nonce,
      domain: connection.domains[0] ?? null,
      status: SsoLoginRequestStatus.PENDING,
      expiresAt,
    });

    const redirectUrl =
      connection.protocol === SsoProtocol.SAML
        ? this.buildSamlRedirectUrl(connection, state)
        : this.buildOidcAuthorizationUrl(connection, state, nonce);

    return { redirectUrl, state, expiresAt };
  }

  // ══════════════════════════════════════════════════════════════════
  // Login — SAML ACS callback
  // ══════════════════════════════════════════════════════════════════

  async handleSamlCallback(dto: SamlCallbackDto, ipAddress?: string): Promise<ISsoLoginResult> {
    const request = await this.getPendingLoginRequestOrThrow(dto.RelayState);
    const connection = await this.repository.findConnectionById(request.connectionId);
    if (!connection) {
      throw new SsoConnectionNotFoundException(request.connectionId);
    }

    const trustedCertificates = connection.encryptedCertificate ? [this.decryptor.decryptValue(connection.encryptedCertificate, connection.scopeKey)] : [];
    const result = parseAndVerifySamlResponse(dto.SAMLResponse, trustedCertificates, connection.issuer ?? undefined);

    if (!result.valid || !result.nameId) {
      await this.failLoginRequest(request, connection, result.error ?? 'Assertion validation failed', ipAddress);
      throw new SsoAssertionInvalidException();
    }

    const groups = connection.groupClaimName ? (result.attributes?.[connection.groupClaimName] ?? []) : [];
    const email = this.extractEmailFromSamlAttributes(result.attributes) ?? result.nameId;

    const normalized: ISsoNormalizedIdentity = { externalUserId: result.nameId, externalEmail: email, externalGroups: groups, raw: result.attributes };
    return this.completeLogin(request, connection, normalized, ipAddress);
  }

  // ══════════════════════════════════════════════════════════════════
  // Login — OIDC callback
  // ══════════════════════════════════════════════════════════════════

  async handleOidcCallback(dto: OidcSsoCallbackDto, ipAddress?: string): Promise<ISsoLoginResult> {
    const request = await this.getPendingLoginRequestOrThrow(dto.state);
    const connection = await this.repository.findConnectionById(request.connectionId);
    if (!connection) {
      throw new SsoConnectionNotFoundException(request.connectionId);
    }

    if (dto.error) {
      await this.failLoginRequest(request, connection, dto.error, ipAddress);
      throw new SsoAssertionInvalidException(dto.error);
    }

    if (!connection.tokenEndpoint || !connection.jwksUri || !connection.clientId || !connection.encryptedClientSecret || !connection.issuer) {
      await this.failLoginRequest(request, connection, 'Connection is missing required OIDC configuration', ipAddress);
      throw new SsoConnectionInvalidDefinitionException('This connection is missing required OIDC configuration');
    }

    const clientSecret = this.decryptor.decryptValue(connection.encryptedClientSecret, connection.scopeKey);
    const redirectUri = this.buildCallbackUrl('oidc', connection.id);

    let tokenResponse: { id_token?: string; access_token?: string };
    try {
      const response = await axios.post(
        connection.tokenEndpoint,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: dto.code,
          redirect_uri: redirectUri,
          client_id: connection.clientId,
          client_secret: clientSecret,
        }).toString(),
        { timeout: SSO_REQUEST_TIMEOUT_MS, headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, validateStatus: () => true },
      );
      if (response.status < 200 || response.status >= 300 || !response.data?.id_token) {
        throw new Error(response.data?.error_description ?? response.data?.error ?? `HTTP ${response.status}`);
      }
      tokenResponse = response.data;
    } catch (error) {
      await this.failLoginRequest(request, connection, (error as Error).message, ipAddress);
      throw new SsoAssertionInvalidException('Token exchange failed');
    }

    const verification = await this.oidcValidator.verifyIdToken(tokenResponse.id_token as string, connection.jwksUri, connection.issuer, connection.clientId, request.nonce ?? undefined);
    if (!verification.valid || !verification.claims) {
      await this.failLoginRequest(request, connection, verification.error ?? 'ID token validation failed', ipAddress);
      throw new SsoAssertionInvalidException();
    }

    const claims = verification.claims;
    const externalUserId = String(claims.sub ?? '');
    const externalEmail = String(claims.email ?? claims.preferred_username ?? '');
    if (!externalUserId || !externalEmail) {
      await this.failLoginRequest(request, connection, 'ID token is missing sub/email claims', ipAddress);
      throw new SsoAssertionInvalidException();
    }
    const groupsClaim = connection.groupClaimName ? claims[connection.groupClaimName] : undefined;
    const groups = Array.isArray(groupsClaim) ? groupsClaim.map(String) : [];

    const normalized: ISsoNormalizedIdentity = { externalUserId, externalEmail, externalGroups: groups, raw: claims };
    return this.completeLogin(request, connection, normalized, ipAddress);
  }

  // ══════════════════════════════════════════════════════════════════
  // Logout
  // ══════════════════════════════════════════════════════════════════

  async logout(userId: string, connectionId?: string): Promise<ISsoLogoutResult> {
    await this.authenticationService.logout(userId);

    if (!connectionId) {
      return {};
    }
    const connection = await this.repository.findConnectionById(connectionId);
    if (!connection?.sloUrl) {
      return {};
    }

    await this.recordAudit(connection.workspaceId ?? connection.organizationId ?? 'unknown', userId, 'sso-framework.logout', AuditActionCategory.OTHER, connection.id);
    await this.publishEvent(SsoFrameworkEvent.SSO_LOGOUT, connection, userId);

    const url = new URL(connection.sloUrl);
    return { idpLogoutUrl: url.toString() };
  }

  // ══════════════════════════════════════════════════════════════════
  // Scheduler-callable sweep (no active scheduler wired — mirrors every other module this session)
  // ══════════════════════════════════════════════════════════════════

  async processExpirySweep(): Promise<{ expiredRequests: number }> {
    const now = new Date();
    const expired = await this.repository.findExpiredPendingLoginRequests(now);
    for (const request of expired) {
      await this.repository.updateLoginRequest(request.id, { status: SsoLoginRequestStatus.EXPIRED });
    }
    this.logger.log(`SSO login request sweep: ${expired.length} stale pending requests expired`);
    return { expiredRequests: expired.length };
  }

  // ══════════════════════════════════════════════════════════════════
  // Private — login completion (JIT provisioning + role mapping + token issuance)
  // ══════════════════════════════════════════════════════════════════

  private async completeLogin(request: ISsoLoginRequest, connection: ISsoConnection, normalized: ISsoNormalizedIdentity, ipAddress?: string): Promise<ISsoLoginResult> {
    const targetWorkspaceId = connection.workspaceId ?? request.workspaceId;
    if (!targetWorkspaceId) {
      await this.failLoginRequest(request, connection, 'Connection has no resolvable target workspace', ipAddress);
      throw new SsoConnectionInvalidDefinitionException('This connection has no resolvable target workspace (ORGANIZATION-scoped connections require workspace resolution not yet configured)');
    }

    let provisioning: { userId: string; identity: ISsoIdentity; isNew: boolean };
    try {
      provisioning = await this.provisionOrLinkIdentity(connection, normalized, targetWorkspaceId);
    } catch (error) {
      await this.failLoginRequest(request, connection, (error as Error).message, ipAddress);
      throw error;
    }

    const user = await this.usersRepository.findById(provisioning.userId);
    if (!user) {
      await this.failLoginRequest(request, connection, 'Provisioned user could not be reloaded', ipAddress);
      throw new SsoAssertionInvalidException();
    }

    const tokens = await this.authenticationService.issueTokensForWorkspace(user, targetWorkspaceId);

    await this.repository.updateLoginRequest(request.id, { status: SsoLoginRequestStatus.COMPLETED, completedAt: new Date() });
    await this.repository.updateIdentity(provisioning.identity.id, { lastLoginAt: new Date(), externalEmail: normalized.externalEmail, externalGroups: normalized.externalGroups });

    await this.recordAudit(targetWorkspaceId, provisioning.userId, 'sso-framework.login.succeeded', AuditActionCategory.LOGIN, connection.id, undefined);
    await this.publishEvent(SsoFrameworkEvent.SSO_LOGIN_SUCCEEDED, connection, provisioning.userId, { isNewIdentity: provisioning.isNew, ipAddress });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      userId: provisioning.userId,
      workspaceId: targetWorkspaceId,
      isNewIdentity: provisioning.isNew,
    };
  }

  private async provisionOrLinkIdentity(
    connection: ISsoConnection,
    normalized: ISsoNormalizedIdentity,
    workspaceId: string,
  ): Promise<{ userId: string; identity: ISsoIdentity; isNew: boolean }> {
    const existingIdentity = await this.repository.findIdentityByConnectionAndExternalUserId(connection.id, normalized.externalUserId);
    if (existingIdentity) {
      // `findById` itself excludes soft-deleted rows, so a `null` here already covers "no longer active".
      const linkedUser = await this.usersRepository.findById(existingIdentity.userId);
      if (!linkedUser) {
        throw new SsoAssertionInvalidException('Linked ATLAS account is no longer active');
      }
      return { userId: existingIdentity.userId, identity: existingIdentity, isNew: false };
    }

    const existingUserByEmail = await this.usersRepository.findByEmail(normalized.externalEmail);
    let userId: string;

    if (existingUserByEmail) {
      // Prevents unauthorized tenant linking: an email that already belongs to an account in a
      // DIFFERENT workspace must never be silently absorbed into this connection's tenant.
      if (existingUserByEmail.workspaceId !== workspaceId) {
        throw new SsoIdentityAlreadyLinkedException();
      }
      userId = existingUserByEmail.id;
    } else {
      if (!connection.jitProvisioningEnabled) {
        throw new SsoProvisioningDisabledException();
      }
      const { firstName, lastName } = this.deriveNameFromClaims(normalized);
      const randomPasswordHash = await bcrypt.hash(randomBytes(32).toString('hex'), JIT_PASSWORD_HASH_ROUNDS);

      const created = await this.usersRepository.create({
        workspace: { connect: { id: workspaceId } },
        email: normalized.externalEmail,
        firstName,
        lastName,
        passwordHash: randomPasswordHash,
        role: 'VIEWER',
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
      } as any);
      userId = created.id;
    }

    const identity = await this.repository.createIdentity({
      connectionId: connection.id,
      workspaceId,
      userId,
      externalUserId: normalized.externalUserId,
      externalEmail: normalized.externalEmail,
      externalGroups: normalized.externalGroups,
    });

    await this.recordAudit(workspaceId, userId, 'sso-framework.identity.provisioned', AuditActionCategory.CREATE, connection.id);
    await this.publishEvent(SsoFrameworkEvent.SSO_IDENTITY_PROVISIONED, connection, userId);

    await this.applyGroupRoleMapping(connection, normalized, userId, workspaceId).catch((error) =>
      this.logger.warn(`SSO group→role mapping failed for user '${userId}' on connection '${connection.id}': ${(error as Error).message}`),
    );

    return { userId, identity, isNew: true };
  }

  /** Best-effort — resolves the highest-priority matching group mapping (falling back to `defaultRoleId`) and delegates to `RolesPermissionsService.assignRole()` acting as the connection's configuring admin, who already held `SSO_MANAGE_ROLES` at registration time. Never blocks login on failure. */
  private async applyGroupRoleMapping(connection: ISsoConnection, normalized: ISsoNormalizedIdentity, userId: string, workspaceId: string): Promise<void> {
    if (!connection.createdBy) {
      return;
    }

    let roleId: string | null = null;
    if (normalized.externalGroups.length > 0) {
      const mappings = await this.repository.findGroupRoleMappingsByConnection(connection.id);
      const match = mappings.find((m) => normalized.externalGroups.includes(m.externalGroup));
      roleId = match?.roleId ?? null;
    }
    roleId = roleId ?? connection.defaultRoleId;
    if (!roleId) {
      return;
    }

    const dto: AssignRoleDto = { roleId, principalType: PrincipalType.USER, principalId: userId } as AssignRoleDto;
    await this.rolesPermissionsService.assignRole(workspaceId, connection.createdBy, SSO_JIT_ACTING_ROLE, dto);
  }

  // ══════════════════════════════════════════════════════════════════
  // Private — protocol helpers
  // ══════════════════════════════════════════════════════════════════

  private buildSamlRedirectUrl(connection: ISsoConnection, state: string): string {
    if (!connection.ssoUrl) {
      throw new SsoConnectionInvalidDefinitionException('This connection has no ssoUrl configured');
    }
    const spEntityId = connection.entityId ?? this.buildCallbackUrl('saml', connection.id);
    const acsUrl = this.buildCallbackUrl('saml', connection.id);
    return buildSamlAuthnRequestUrl(connection.ssoUrl, spEntityId, acsUrl, state);
  }

  private buildOidcAuthorizationUrl(connection: ISsoConnection, state: string, nonce: string): string {
    if (!connection.authorizationEndpoint || !connection.clientId) {
      throw new SsoConnectionInvalidDefinitionException('This connection has no authorizationEndpoint/clientId configured');
    }
    const redirectUri = this.buildCallbackUrl('oidc', connection.id);
    const url = new URL(connection.authorizationEndpoint);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', connection.clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    const scopes = connection.scopes.length > 0 ? connection.scopes : ['openid', 'profile', 'email'];
    url.searchParams.set('scope', scopes.join(' '));
    url.searchParams.set('state', state);
    url.searchParams.set('nonce', nonce);
    return url.toString();
  }

  private buildCallbackUrl(protocol: 'saml' | 'oidc', connectionId: string): string {
    const baseUrl = process.env['ATLAS_BASE_URL'] ?? 'http://localhost:3000';
    const suffix = protocol === 'saml' ? `sso-framework/saml/${connectionId}/acs` : `sso-framework/oidc/${connectionId}/callback`;
    return `${baseUrl}/${API.PREFIX}/v${API.VERSION}/${suffix}`;
  }

  private extractEmailFromSamlAttributes(attributes?: Record<string, string[]>): string | null {
    if (!attributes) return null;
    const candidateKeys = Object.keys(attributes).filter((key) => /email/i.test(key));
    for (const key of candidateKeys) {
      const value = attributes[key]?.[0];
      if (value) return value;
    }
    return null;
  }

  private deriveNameFromClaims(normalized: ISsoNormalizedIdentity): { firstName: string; lastName: string } {
    const raw = normalized.raw ?? {};
    const firstName = (raw['given_name'] as string) ?? (raw['firstName'] as string) ?? (raw['FirstName'] as string) ?? normalized.externalEmail.split('@')[0] ?? 'SSO';
    const lastName = (raw['family_name'] as string) ?? (raw['lastName'] as string) ?? (raw['LastName'] as string) ?? 'User';
    return { firstName: String(firstName), lastName: String(lastName) };
  }

  // ══════════════════════════════════════════════════════════════════
  // Private — shared helpers
  // ══════════════════════════════════════════════════════════════════

  private async getPendingLoginRequestOrThrow(state: string | undefined): Promise<ISsoLoginRequest> {
    if (!state) {
      throw new SsoLoginRequestNotFoundException();
    }
    const request = await this.repository.findLoginRequestByState(state);
    if (!request) {
      throw new SsoLoginRequestNotFoundException();
    }
    if (request.status !== SsoLoginRequestStatus.PENDING) {
      throw new SsoLoginRequestInvalidStateException();
    }
    if (request.expiresAt.getTime() <= Date.now()) {
      await this.repository.updateLoginRequest(request.id, { status: SsoLoginRequestStatus.EXPIRED });
      throw new SsoLoginRequestExpiredException();
    }
    return request;
  }

  private async failLoginRequest(request: ISsoLoginRequest, connection: ISsoConnection, reason: string, ipAddress?: string): Promise<void> {
    await this.repository.updateLoginRequest(request.id, { status: SsoLoginRequestStatus.FAILED, failureReason: reason, completedAt: new Date() });
    await this.recordAudit(connection.workspaceId ?? connection.organizationId ?? 'unknown', 'system', 'sso-framework.login.failed', AuditActionCategory.LOGIN, connection.id, AuditRiskLevel.SUSPICIOUS);
    await this.publishEvent(SsoFrameworkEvent.SSO_LOGIN_FAILED, connection, undefined, { reason, ipAddress });
  }

  private async transition(
    connection: ISsoConnection,
    to: SsoConnectionStatus,
    userId: string,
    changeType: SsoChangeType,
    event: SsoFrameworkEvent,
    reason?: string,
  ): Promise<ISsoConnection> {
    if (!CONNECTION_TRANSITIONS[connection.status]?.includes(to)) {
      throw new SsoConnectionInvalidStateTransitionException(connection.status, to);
    }

    const updated = await this.repository.updateConnection(connection.id, { status: to });
    await this.recordHistory(connection.id, connection.workspaceId, changeType, connection.status, to, userId, this.sanitizeForHistory(updated), reason);
    await this.recordAudit(
      connection.workspaceId ?? connection.organizationId ?? 'unknown',
      userId,
      `sso-framework.connection.${changeType.toLowerCase()}`,
      AuditActionCategory.UPDATE,
      connection.id,
      AuditRiskLevel.SUSPICIOUS,
    );
    await this.publishEvent(event, updated, userId, reason ? { reason } : undefined);
    return updated;
  }

  private async assertCanManage(workspaceId: string, userId: string, userRole: string): Promise<void> {
    if (SSO_MANAGE_ROLES.includes(userRole)) {
      return;
    }
    const hasGranularRole = await this.rolesPermissionsService.userHasActiveRole(workspaceId, userId, 'ADMIN');
    if (!hasGranularRole) {
      throw new SsoAccessDeniedException();
    }
  }

  private assertConnectionActive(connection: ISsoConnection): void {
    if (connection.status !== SsoConnectionStatus.ACTIVE) {
      throw new SsoConnectionInactiveException();
    }
  }

  private assertValidDefinition(protocol: SsoProtocol, dto: RegisterSsoConnectionDto): void {
    if (protocol === SsoProtocol.SAML && (!dto.ssoUrl || !dto.certificate)) {
      throw new SsoConnectionInvalidDefinitionException('SAML connections require ssoUrl and certificate');
    }
    if (protocol === SsoProtocol.OIDC && (!dto.authorizationEndpoint || !dto.tokenEndpoint || !dto.jwksUri || !dto.clientId || !dto.clientSecret || !dto.issuer)) {
      throw new SsoConnectionInvalidDefinitionException('OIDC connections require issuer, authorizationEndpoint, tokenEndpoint, jwksUri, clientId and clientSecret');
    }
  }

  private async assertDomainsAvailable(domains: string[], excludeConnectionId?: string): Promise<void> {
    const normalizedDomains = domains.map((d) => d.toLowerCase());
    const conflicting = await this.repository.findConnectionsWithAnyDomain(normalizedDomains, excludeConnectionId);
    if (conflicting.length > 0) {
      const overlap = conflicting[0]?.domains.find((d) => normalizedDomains.includes(d)) ?? normalizedDomains[0];
      throw new SsoDomainAlreadyRegisteredException(overlap as string);
    }
  }

  private async getVisibleConnectionOrThrow(id: string, workspaceId: string, organizationId?: string): Promise<ISsoConnection> {
    const connection = await this.repository.findConnectionById(id);
    const visible = !!connection && (connection.workspaceId === workspaceId || (!!organizationId && connection.organizationId === organizationId));
    if (!connection || !visible) {
      throw new SsoConnectionNotFoundException(id);
    }
    return connection;
  }

  /** Snapshots never include `encryptedCertificate`/`encryptedClientSecret` — history is inspectable by workspace admins and must never leak secret material either. */
  private sanitizeForHistory(connection: ISsoConnection): Record<string, unknown> {
    const { encryptedCertificate: _encryptedCertificate, encryptedClientSecret: _encryptedClientSecret, ...safe } = connection;
    return safe;
  }

  private async recordHistory(
    connectionId: string,
    workspaceId: string | null,
    changeType: SsoChangeType,
    fromStatus: string | null,
    toStatus: string | null,
    changedBy: string | null,
    snapshot: Record<string, unknown>,
    reason?: string,
  ): Promise<void> {
    await this.repository.createHistory({ connectionId, workspaceId, changeType, fromStatus, toStatus, reason: reason ?? null, changedBy, snapshot: snapshot as any });
  }

  private async recordAudit(
    workspaceId: string,
    actorId: string,
    action: string,
    actionCategory: AuditActionCategory,
    entityId: string,
    riskLevel?: AuditRiskLevel,
  ): Promise<void> {
    await this.auditLogsService.record({
      workspaceId,
      actorType: actorId === 'system' ? ActivityActorType.SYSTEM : ActivityActorType.USER,
      actorId: actorId === 'system' ? undefined : actorId,
      action,
      actionCategory,
      module: SSO_FRAMEWORK_MODULE,
      entityType: 'SsoConnection',
      entityId,
      outcome: ActivityOutcome.SUCCESS,
      riskLevel,
    });
  }

  private async publishEvent(event: SsoFrameworkEvent, connection: ISsoConnection, actorId?: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.eventQueue.publish({ event, connectionId: connection.id, workspaceId: connection.workspaceId, scopeKey: connection.scopeKey, actorId, metadata });
  }
}
