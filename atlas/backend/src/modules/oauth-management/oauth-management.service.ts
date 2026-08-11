import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { RolesPermissionsService } from '@modules/roles-permissions/roles-permissions.service';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { ActivityActorType, ActivityOutcome, AuditActionCategory, AuditRiskLevel } from '@modules/audit-logs/interfaces';
import { OAuthManagementRepository } from './oauth-management.repository';
import { OAuthCredentialEncryptor } from './oauth-credential.encryptor';
import { OAuthCredentialDecryptor } from './oauth-credential.decryptor';
import { OAuthManagementEventQueue } from './jobs';
import { generateNonce, generateState } from './oauth-crypto.util';
import { buildOAuthScopeKey } from './scope-key.util';
import {
  RegisterOAuthClientDto,
  UpdateOAuthClientDto,
  RotateClientSecretDto,
  OAuthClientFilterDto,
  OAuthConnectionFilterDto,
  AuthorizeConnectionDto,
  OAuthCallbackDto,
  ConnectClientCredentialsDto,
  OAuthReasonDto,
  PaginatedOAuthClientResponseDto,
  PaginatedOAuthConnectionResponseDto,
} from './dto';
import {
  OAuthChangeType,
  OAuthClientStatus,
  OAuthConnectionStatus,
  OAuthAuthorizationRequestStatus,
  OAuthGrantType,
  OAuthHistoryEntityType,
  OAuthManagementEvent,
  OAuthScopeType,
  IOAuthAuthorizeResult,
  IOAuthClient,
  IOAuthConnection,
  IOAuthConnectionTestResult,
  IOAuthHistory,
} from './interfaces';
import {
  AUTHORIZATION_REQUEST_TTL_MS,
  OAUTH_MANAGE_ROLES,
  OAUTH_MANAGEMENT_MODULE,
  OAUTH_REQUEST_TIMEOUT_MS,
  TOKEN_REFRESH_LOOKAHEAD_MS,
} from './constants';
import {
  OAuthAccessDeniedException,
  OAuthAuthorizationRequestExpiredException,
  OAuthAuthorizationRequestInvalidStateException,
  OAuthAuthorizationRequestNotFoundException,
  OAuthClientAlreadyExistsException,
  OAuthClientInactiveException,
  OAuthClientInvalidDefinitionException,
  OAuthClientInvalidStateTransitionException,
  OAuthClientNotFoundException,
  OAuthConnectionAlreadyExistsException,
  OAuthConnectionInvalidStateTransitionException,
  OAuthConnectionNotFoundException,
  OAuthRedirectUriNotAllowedException,
  OAuthTokenExchangeFailedException,
  OAuthTokenRefreshFailedException,
} from './exceptions/oauth-management.exceptions';

interface ITokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
}

const CLIENT_TRANSITIONS: Record<OAuthClientStatus, OAuthClientStatus[]> = {
  [OAuthClientStatus.ACTIVE]: [OAuthClientStatus.DISABLED, OAuthClientStatus.REVOKED, OAuthClientStatus.ARCHIVED],
  [OAuthClientStatus.DISABLED]: [OAuthClientStatus.ACTIVE, OAuthClientStatus.REVOKED, OAuthClientStatus.ARCHIVED],
  [OAuthClientStatus.REVOKED]: [OAuthClientStatus.ARCHIVED],
  [OAuthClientStatus.ARCHIVED]: [],
};

const CONNECTION_TRANSITIONS: Record<OAuthConnectionStatus, OAuthConnectionStatus[]> = {
  [OAuthConnectionStatus.CONNECTED]: [OAuthConnectionStatus.EXPIRED, OAuthConnectionStatus.REVOKED, OAuthConnectionStatus.DISCONNECTED],
  [OAuthConnectionStatus.EXPIRED]: [OAuthConnectionStatus.CONNECTED, OAuthConnectionStatus.REVOKED, OAuthConnectionStatus.DISCONNECTED],
  [OAuthConnectionStatus.REVOKED]: [],
  [OAuthConnectionStatus.DISCONNECTED]: [OAuthConnectionStatus.CONNECTED],
};

@Injectable()
export class OAuthManagementService {
  private readonly logger = new Logger(OAuthManagementService.name);

  constructor(
    private readonly repository: OAuthManagementRepository,
    private readonly encryptor: OAuthCredentialEncryptor,
    private readonly decryptor: OAuthCredentialDecryptor,
    private readonly rolesPermissionsService: RolesPermissionsService,
    private readonly auditLogsService: AuditLogsService,
    private readonly eventQueue: OAuthManagementEventQueue,
  ) {}

  // ══════════════════════════════════════════════════════════════════
  // Clients
  // ══════════════════════════════════════════════════════════════════

  /** `dto.clientSecret` is whatever the external provider issued when the app was registered there — ATLAS never invents an OAuth client secret, it only encrypts and stores it. */
  async registerClient(workspaceId: string, userId: string, userRole: string, dto: RegisterOAuthClientDto): Promise<IOAuthClient> {
    await this.assertCanManage(workspaceId, userId, userRole);

    if (dto.scopeType !== OAuthScopeType.ORGANIZATION && dto.scopeType !== OAuthScopeType.WORKSPACE) {
      throw new OAuthClientInvalidDefinitionException('OAuth clients may only be registered at ORGANIZATION or WORKSPACE scope');
    }
    this.assertValidEndpoint(dto.authorizationEndpoint);
    this.assertValidEndpoint(dto.tokenEndpoint);

    const scopeKey = buildOAuthScopeKey({ scopeType: dto.scopeType, workspaceId, organizationId: dto.organizationId });

    const existing = await this.repository.findClientByScopeKeyAndName(scopeKey, dto.name);
    if (existing) {
      throw new OAuthClientAlreadyExistsException(dto.name);
    }

    const encryptedClientSecret = this.encryptor.encryptValue(dto.clientSecret, scopeKey);

    const client = await this.repository.createClient({
      workspaceId: dto.scopeType === OAuthScopeType.ORGANIZATION ? null : workspaceId,
      organizationId: dto.organizationId ?? null,
      scopeType: dto.scopeType,
      scopeKey,
      name: dto.name,
      description: dto.description ?? null,
      providerKey: dto.providerKey,
      clientId: dto.clientId,
      encryptedClientSecret,
      redirectUris: dto.redirectUris,
      scopes: dto.scopes ?? [],
      grantTypes: dto.grantTypes,
      environment: dto.environment ?? 'production',
      authorizationEndpoint: dto.authorizationEndpoint,
      tokenEndpoint: dto.tokenEndpoint,
      revocationEndpoint: dto.revocationEndpoint ?? null,
      userInfoEndpoint: dto.userInfoEndpoint ?? null,
      status: OAuthClientStatus.ACTIVE,
      createdBy: userId,
    });

    await this.recordHistory(OAuthHistoryEntityType.CLIENT, client.id, client.workspaceId, OAuthChangeType.CLIENT_REGISTERED, null, OAuthClientStatus.ACTIVE, userId, this.sanitizeClientForHistory(client));
    await this.recordAudit(workspaceId, userId, 'oauth-management.client.registered', AuditActionCategory.CREATE, client.id);
    await this.publishEvent(OAuthManagementEvent.OAUTH_CLIENT_REGISTERED, OAuthHistoryEntityType.CLIENT, client.id, client.workspaceId, client.scopeKey, userId);

    return client;
  }

  async updateClient(id: string, workspaceId: string, userId: string, userRole: string, dto: UpdateOAuthClientDto): Promise<IOAuthClient> {
    const client = await this.getVisibleClientOrThrow(id, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);

    if (dto.authorizationEndpoint) this.assertValidEndpoint(dto.authorizationEndpoint);
    if (dto.tokenEndpoint) this.assertValidEndpoint(dto.tokenEndpoint);

    const updated = await this.repository.updateClient(id, {
      name: dto.name ?? client.name,
      description: dto.description ?? client.description,
      redirectUris: dto.redirectUris ?? client.redirectUris,
      scopes: dto.scopes ?? client.scopes,
      grantTypes: dto.grantTypes ?? client.grantTypes,
      environment: dto.environment ?? client.environment,
      authorizationEndpoint: dto.authorizationEndpoint ?? client.authorizationEndpoint,
      tokenEndpoint: dto.tokenEndpoint ?? client.tokenEndpoint,
      revocationEndpoint: dto.revocationEndpoint ?? client.revocationEndpoint,
      userInfoEndpoint: dto.userInfoEndpoint ?? client.userInfoEndpoint,
    });

    await this.recordHistory(OAuthHistoryEntityType.CLIENT, id, client.workspaceId, OAuthChangeType.CLIENT_UPDATED, null, null, userId, this.sanitizeClientForHistory(updated));
    await this.recordAudit(workspaceId, userId, 'oauth-management.client.updated', AuditActionCategory.UPDATE, id);
    await this.publishEvent(OAuthManagementEvent.OAUTH_CLIENT_UPDATED, OAuthHistoryEntityType.CLIENT, id, updated.workspaceId, updated.scopeKey, userId);
    return updated;
  }

  async enableClient(id: string, workspaceId: string, userId: string, userRole: string): Promise<IOAuthClient> {
    const client = await this.getVisibleClientOrThrow(id, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);
    return this.transitionClient(client, OAuthClientStatus.ACTIVE, userId, OAuthChangeType.CLIENT_ENABLED, OAuthManagementEvent.OAUTH_CLIENT_ENABLED);
  }

  async disableClient(id: string, workspaceId: string, userId: string, userRole: string): Promise<IOAuthClient> {
    const client = await this.getVisibleClientOrThrow(id, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);
    return this.transitionClient(client, OAuthClientStatus.DISABLED, userId, OAuthChangeType.CLIENT_DISABLED, OAuthManagementEvent.OAUTH_CLIENT_DISABLED);
  }

  async revokeClient(id: string, workspaceId: string, userId: string, userRole: string, dto: OAuthReasonDto): Promise<IOAuthClient> {
    const client = await this.getVisibleClientOrThrow(id, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);
    return this.transitionClient(client, OAuthClientStatus.REVOKED, userId, OAuthChangeType.CLIENT_REVOKED, OAuthManagementEvent.OAUTH_CLIENT_REVOKED, dto.reason);
  }

  async archiveClient(id: string, workspaceId: string, userId: string, userRole: string): Promise<IOAuthClient> {
    const client = await this.getVisibleClientOrThrow(id, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);
    return this.transitionClient(client, OAuthClientStatus.ARCHIVED, userId, OAuthChangeType.CLIENT_ARCHIVED, OAuthManagementEvent.OAUTH_CLIENT_ARCHIVED);
  }

  /** `dto.clientSecret` is the NEW secret as re-rolled on the provider's side — ATLAS just re-encrypts and stores it. */
  async rotateClientSecret(id: string, workspaceId: string, userId: string, userRole: string, dto: RotateClientSecretDto): Promise<IOAuthClient> {
    const client = await this.getVisibleClientOrThrow(id, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);

    const encryptedClientSecret = this.encryptor.encryptValue(dto.clientSecret, client.scopeKey);
    const updated = await this.repository.updateClient(id, { encryptedClientSecret });

    await this.recordHistory(OAuthHistoryEntityType.CLIENT, id, client.workspaceId, OAuthChangeType.CLIENT_SECRET_ROTATED, null, null, userId, this.sanitizeClientForHistory(updated));
    await this.recordAudit(workspaceId, userId, 'oauth-management.client.secret_rotated', AuditActionCategory.UPDATE, id, AuditRiskLevel.SUSPICIOUS);
    await this.publishEvent(OAuthManagementEvent.OAUTH_CLIENT_SECRET_ROTATED, OAuthHistoryEntityType.CLIENT, id, updated.workspaceId, updated.scopeKey, userId);

    return updated;
  }

  async getClient(id: string, workspaceId: string): Promise<IOAuthClient> {
    return this.getVisibleClientOrThrow(id, workspaceId);
  }

  async getClientHistory(id: string, workspaceId: string): Promise<IOAuthHistory[]> {
    await this.getVisibleClientOrThrow(id, workspaceId);
    return this.repository.findHistory(id);
  }

  async findAllClients(workspaceId: string, filter: OAuthClientFilterDto): Promise<PaginatedOAuthClientResponseDto> {
    const [data, total] = await this.repository.findAllClients(workspaceId, filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ══════════════════════════════════════════════════════════════════
  // Connections — authorization-code flow
  // ══════════════════════════════════════════════════════════════════

  async authorizeConnection(clientId: string, workspaceId: string, userId: string, userRole: string, dto: AuthorizeConnectionDto): Promise<IOAuthAuthorizeResult> {
    const client = await this.getVisibleClientOrThrow(clientId, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);
    this.assertClientActive(client);

    if (!client.grantTypes.includes(OAuthGrantType.AUTHORIZATION_CODE)) {
      throw new OAuthClientInvalidDefinitionException('This client is not configured for the authorization-code grant type');
    }

    const redirectUri = dto.redirectUri ?? client.redirectUris[0];
    if (!redirectUri || !client.redirectUris.includes(redirectUri)) {
      throw new OAuthRedirectUriNotAllowedException(redirectUri ?? '');
    }

    const scopeKey = buildOAuthScopeKey({
      scopeType: dto.scopeType,
      workspaceId,
      organizationId: dto.organizationId,
      serviceAccountHandle: dto.serviceAccountHandle,
    });

    const requestedScopes = dto.scopes ?? client.scopes;
    const state = generateState();
    const nonce = generateNonce();
    const expiresAt = new Date(Date.now() + AUTHORIZATION_REQUEST_TTL_MS);

    await this.repository.createAuthorizationRequest({
      clientId: client.id,
      workspaceId: dto.scopeType === OAuthScopeType.ORGANIZATION ? null : workspaceId,
      organizationId: dto.organizationId ?? null,
      scopeType: dto.scopeType,
      scopeKey,
      initiatedByUserId: userId,
      state,
      nonce,
      redirectUri,
      requestedScopes,
      status: OAuthAuthorizationRequestStatus.PENDING,
      expiresAt,
    });

    const authorizationUrl = this.buildAuthorizationUrl(client, redirectUri, requestedScopes, state, nonce);
    return { authorizationUrl, state, expiresAt };
  }

  /** Exchanges the authorization code for tokens and creates (or reconnects) the `OAuthConnection`. */
  async handleCallback(dto: OAuthCallbackDto): Promise<IOAuthConnection> {
    const request = await this.repository.findAuthorizationRequestByState(dto.state);
    if (!request) {
      throw new OAuthAuthorizationRequestNotFoundException();
    }
    if (request.status !== OAuthAuthorizationRequestStatus.PENDING) {
      throw new OAuthAuthorizationRequestInvalidStateException();
    }
    if (request.expiresAt.getTime() <= Date.now()) {
      await this.repository.updateAuthorizationRequest(request.id, { status: OAuthAuthorizationRequestStatus.EXPIRED });
      throw new OAuthAuthorizationRequestExpiredException();
    }

    if (dto.error) {
      await this.repository.updateAuthorizationRequest(request.id, { status: OAuthAuthorizationRequestStatus.FAILED, completedAt: new Date() });
      await this.recordAudit(request.workspaceId ?? request.organizationId ?? 'unknown', request.initiatedByUserId ?? 'system', 'oauth-management.connection.authorization_failed', AuditActionCategory.OTHER, request.clientId, AuditRiskLevel.SUSPICIOUS);
      throw new OAuthTokenExchangeFailedException(dto.error);
    }

    const client = await this.repository.findClientById(request.clientId);
    if (!client) {
      throw new OAuthClientNotFoundException(request.clientId);
    }

    const clientSecret = this.decryptor.decryptValue(client.encryptedClientSecret, client.scopeKey);

    let tokenResponse: ITokenResponse;
    try {
      tokenResponse = await this.exchangeToken(client, {
        grant_type: 'authorization_code',
        code: dto.code,
        redirect_uri: request.redirectUri,
        client_id: client.clientId,
        client_secret: clientSecret,
      });
    } catch (error) {
      await this.repository.updateAuthorizationRequest(request.id, { status: OAuthAuthorizationRequestStatus.FAILED, completedAt: new Date() });
      await this.recordAudit(request.workspaceId ?? request.organizationId ?? 'unknown', request.initiatedByUserId ?? 'system', 'oauth-management.connection.authorization_failed', AuditActionCategory.OTHER, client.id, AuditRiskLevel.SUSPICIOUS);
      throw new OAuthTokenExchangeFailedException((error as Error).message);
    }

    const externalAccount = await this.fetchExternalAccount(client, tokenResponse.access_token);

    let connection: IOAuthConnection;
    try {
      connection = await this.upsertConnection({
        client,
        scopeType: request.scopeType,
        workspaceId: request.workspaceId,
        organizationId: request.organizationId,
        scopeKey: request.scopeKey,
        ownerUserId: request.scopeType === OAuthScopeType.USER ? request.initiatedByUserId : null,
        serviceAccountHandle: null,
        externalAccountId: externalAccount?.id ?? null,
        externalAccountLabel: externalAccount?.label ?? null,
        grantedScopes: tokenResponse.scope ? tokenResponse.scope.split(' ') : request.requestedScopes,
        grantType: OAuthGrantType.AUTHORIZATION_CODE,
        tokenResponse,
        actorId: request.initiatedByUserId ?? undefined,
      });
    } catch (error) {
      // Tokens were already issued by the provider at this point (the one-time code is now consumed) but couldn't be
      // stored (e.g. an active connection already exists for this identity) — best-effort revoke rather than leaving
      // a live, unmanaged token outstanding at the provider, then fail the request instead of leaving it dangling PENDING.
      await this.attemptProviderRevocation(client, {
        id: request.clientId,
        scopeKey: request.scopeKey,
        encryptedAccessToken: this.encryptor.encryptValue(tokenResponse.access_token, request.scopeKey),
        encryptedRefreshToken: tokenResponse.refresh_token ? this.encryptor.encryptValue(tokenResponse.refresh_token, request.scopeKey) : null,
      } as IOAuthConnection).catch((revokeError) => this.logger.warn(`Best-effort revocation of unstorable connection failed: ${(revokeError as Error).message}`));

      await this.repository.updateAuthorizationRequest(request.id, { status: OAuthAuthorizationRequestStatus.FAILED, completedAt: new Date() });
      await this.recordAudit(request.workspaceId ?? request.organizationId ?? 'unknown', request.initiatedByUserId ?? 'system', 'oauth-management.connection.authorization_failed', AuditActionCategory.OTHER, client.id, AuditRiskLevel.SUSPICIOUS);
      throw error;
    }

    await this.repository.updateAuthorizationRequest(request.id, { status: OAuthAuthorizationRequestStatus.COMPLETED, completedAt: new Date() });
    return connection;
  }

  // ══════════════════════════════════════════════════════════════════
  // Connections — client-credentials flow
  // ══════════════════════════════════════════════════════════════════

  async connectClientCredentials(clientId: string, workspaceId: string, userId: string, userRole: string, dto: ConnectClientCredentialsDto): Promise<IOAuthConnection> {
    const client = await this.getVisibleClientOrThrow(clientId, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);
    this.assertClientActive(client);

    if (!client.grantTypes.includes(OAuthGrantType.CLIENT_CREDENTIALS)) {
      throw new OAuthClientInvalidDefinitionException('This client is not configured for the client-credentials grant type');
    }

    const clientSecret = this.decryptor.decryptValue(client.encryptedClientSecret, client.scopeKey);
    const requestedScopes = dto.scopes ?? client.scopes;

    const scopeKey = buildOAuthScopeKey({
      scopeType: dto.scopeType,
      workspaceId,
      organizationId: dto.organizationId,
      serviceAccountHandle: dto.serviceAccountHandle,
    });

    let tokenResponse: ITokenResponse;
    try {
      tokenResponse = await this.exchangeToken(client, {
        grant_type: 'client_credentials',
        client_id: client.clientId,
        client_secret: clientSecret,
        scope: requestedScopes.join(' '),
      });
    } catch (error) {
      throw new OAuthTokenExchangeFailedException((error as Error).message);
    }

    return this.upsertConnection({
      client,
      scopeType: dto.scopeType,
      workspaceId: dto.scopeType === OAuthScopeType.ORGANIZATION ? null : workspaceId,
      organizationId: dto.organizationId ?? null,
      scopeKey,
      ownerUserId: null,
      serviceAccountHandle: dto.serviceAccountHandle ?? null,
      externalAccountId: null,
      externalAccountLabel: null,
      grantedScopes: tokenResponse.scope ? tokenResponse.scope.split(' ') : requestedScopes,
      grantType: OAuthGrantType.CLIENT_CREDENTIALS,
      tokenResponse,
      actorId: userId,
    });
  }

  // ══════════════════════════════════════════════════════════════════
  // Connections — refresh / revoke / disconnect / test
  // ══════════════════════════════════════════════════════════════════

  async refreshConnection(id: string, workspaceId?: string): Promise<IOAuthConnection> {
    const connection = workspaceId ? await this.getVisibleConnectionOrThrow(id, workspaceId) : await this.repository.findConnectionById(id);
    if (!connection) {
      throw new OAuthConnectionNotFoundException(id);
    }
    if (!connection.encryptedRefreshToken) {
      throw new OAuthTokenRefreshFailedException('No refresh token is stored for this connection');
    }

    const client = await this.repository.findClientById(connection.clientId);
    if (!client) {
      throw new OAuthClientNotFoundException(connection.clientId);
    }

    const clientSecret = this.decryptor.decryptValue(client.encryptedClientSecret, client.scopeKey);
    const refreshToken = this.decryptor.decryptValue(connection.encryptedRefreshToken, connection.scopeKey);

    try {
      const tokenResponse = await this.exchangeToken(client, {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: client.clientId,
        client_secret: clientSecret,
      });

      const updated = await this.repository.updateConnection(connection.id, {
        status: OAuthConnectionStatus.CONNECTED,
        encryptedAccessToken: this.encryptor.encryptValue(tokenResponse.access_token, connection.scopeKey),
        encryptedRefreshToken: tokenResponse.refresh_token ? this.encryptor.encryptValue(tokenResponse.refresh_token, connection.scopeKey) : connection.encryptedRefreshToken,
        accessTokenExpiresAt: tokenResponse.expires_in ? new Date(Date.now() + tokenResponse.expires_in * 1000) : null,
        lastRefreshedAt: new Date(),
        consecutiveFailures: 0,
        lastFailureAt: null,
        lastFailureReason: null,
      });

      if (connection.status !== OAuthConnectionStatus.CONNECTED) {
        await this.recordHistory(OAuthHistoryEntityType.CONNECTION, connection.id, connection.workspaceId, OAuthChangeType.CONNECTION_REFRESHED, connection.status, OAuthConnectionStatus.CONNECTED, 'system', this.sanitizeConnectionForHistory(updated));
      }
      await this.publishEvent(OAuthManagementEvent.OAUTH_CONNECTION_REFRESHED, OAuthHistoryEntityType.CONNECTION, connection.id, updated.workspaceId, updated.scopeKey);
      return updated;
    } catch (error) {
      const message = (error as Error).message;
      const consecutiveFailures = connection.consecutiveFailures + 1;
      const permanentFailure = /invalid_grant|invalid_token|unauthorized/i.test(message);
      const nextStatus = permanentFailure ? OAuthConnectionStatus.EXPIRED : connection.status;

      const updated = await this.repository.updateConnection(connection.id, {
        status: nextStatus,
        consecutiveFailures,
        lastFailureAt: new Date(),
        lastFailureReason: message,
      });

      await this.publishEvent(OAuthManagementEvent.OAUTH_CONNECTION_REFRESH_FAILED, OAuthHistoryEntityType.CONNECTION, connection.id, updated.workspaceId, updated.scopeKey, undefined, { error: message });

      if (nextStatus === OAuthConnectionStatus.EXPIRED && connection.status !== OAuthConnectionStatus.EXPIRED) {
        await this.recordHistory(OAuthHistoryEntityType.CONNECTION, connection.id, connection.workspaceId, OAuthChangeType.CONNECTION_EXPIRED, connection.status, OAuthConnectionStatus.EXPIRED, 'system', this.sanitizeConnectionForHistory(updated));
        await this.recordAudit(connection.workspaceId ?? connection.organizationId ?? 'unknown', 'system', 'oauth-management.connection.expired', AuditActionCategory.UPDATE, connection.id, AuditRiskLevel.SUSPICIOUS);
      }

      throw new OAuthTokenRefreshFailedException(message);
    }
  }

  async revokeConnection(id: string, workspaceId: string, userId: string, userRole: string, dto: OAuthReasonDto): Promise<IOAuthConnection> {
    const connection = await this.getVisibleConnectionOrThrow(id, workspaceId);
    await this.assertCanManageConnection(connection, userId, userRole);

    const client = await this.repository.findClientById(connection.clientId);
    if (client?.revocationEndpoint && connection.encryptedAccessToken) {
      await this.attemptProviderRevocation(client, connection).catch((error) =>
        this.logger.warn(`Provider-side revocation failed for connection '${connection.id}': ${(error as Error).message}`),
      );
    }

    return this.transitionConnection(connection, OAuthConnectionStatus.REVOKED, userId, OAuthChangeType.CONNECTION_REVOKED, OAuthManagementEvent.OAUTH_CONNECTION_REVOKED, dto.reason, {
      revokedAt: new Date(),
      revokedReason: dto.reason ?? null,
    });
  }

  async disconnectConnection(id: string, workspaceId: string, userId: string, userRole: string): Promise<IOAuthConnection> {
    const connection = await this.getVisibleConnectionOrThrow(id, workspaceId);
    await this.assertCanManageConnection(connection, userId, userRole);

    return this.transitionConnection(connection, OAuthConnectionStatus.DISCONNECTED, userId, OAuthChangeType.CONNECTION_DISCONNECTED, OAuthManagementEvent.OAUTH_CONNECTION_DISCONNECTED, undefined, {
      disconnectedAt: new Date(),
    });
  }

  /** Non-throwing — attempts a lightweight authenticated call using the stored access token. */
  async testConnection(id: string, workspaceId: string): Promise<IOAuthConnectionTestResult> {
    const connection = await this.getVisibleConnectionOrThrow(id, workspaceId);
    const client = await this.repository.findClientById(connection.clientId);
    if (!client) {
      return { success: false, error: 'Owning OAuth client no longer exists' };
    }
    if (!connection.encryptedAccessToken) {
      return { success: false, error: 'No access token is stored for this connection' };
    }
    if (!client.userInfoEndpoint) {
      const expired = connection.accessTokenExpiresAt ? connection.accessTokenExpiresAt.getTime() <= Date.now() : false;
      return { success: !expired, error: expired ? 'Access token has expired' : undefined };
    }

    const accessToken = this.decryptor.decryptValue(connection.encryptedAccessToken, connection.scopeKey);
    const startedAt = Date.now();
    try {
      const response = await axios.get(client.userInfoEndpoint, {
        timeout: OAUTH_REQUEST_TIMEOUT_MS,
        headers: { Authorization: `Bearer ${accessToken}` },
        validateStatus: () => true,
      });
      const latencyMs = Date.now() - startedAt;
      const success = response.status >= 200 && response.status < 300;
      return { success, statusCode: response.status, latencyMs, error: success ? undefined : `Endpoint responded with status ${response.status}` };
    } catch (error) {
      return { success: false, latencyMs: Date.now() - startedAt, error: (error as Error).message };
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // Scheduler-callable sweep (no active scheduler wired — mirrors every other module this session)
  // ══════════════════════════════════════════════════════════════════

  async processExpirySweep(): Promise<{ refreshed: number; refreshFailed: number; expired: number; expiredRequests: number }> {
    const now = new Date();
    const refreshLookahead = new Date(Date.now() + TOKEN_REFRESH_LOOKAHEAD_MS);

    const dueForRefresh = await this.repository.findConnectionsDueForRefresh(refreshLookahead);
    let refreshed = 0;
    let refreshFailed = 0;
    for (const connection of dueForRefresh) {
      try {
        await this.refreshConnection(connection.id);
        refreshed++;
      } catch (error) {
        refreshFailed++;
        this.logger.warn(`Sweep refresh failed for connection '${connection.id}': ${(error as Error).message}`);
      }
    }

    const expiredWithoutRefresh = await this.repository.findExpiredWithoutRefreshToken(now);
    for (const connection of expiredWithoutRefresh) {
      await this.transitionConnection(connection, OAuthConnectionStatus.EXPIRED, 'system', OAuthChangeType.CONNECTION_EXPIRED, OAuthManagementEvent.OAUTH_CONNECTION_EXPIRED, 'Access token expired with no refresh token available', {});
    }

    const expiredRequests = await this.repository.findExpiredPendingRequests(now);
    for (const request of expiredRequests) {
      await this.repository.updateAuthorizationRequest(request.id, { status: OAuthAuthorizationRequestStatus.EXPIRED });
    }

    this.logger.log(`OAuth expiry sweep: ${refreshed} refreshed, ${refreshFailed} refresh-failed, ${expiredWithoutRefresh.length} expired, ${expiredRequests.length} stale authorization requests expired`);
    return { refreshed, refreshFailed, expired: expiredWithoutRefresh.length, expiredRequests: expiredRequests.length };
  }

  // ══════════════════════════════════════════════════════════════════
  // Connection reads
  // ══════════════════════════════════════════════════════════════════

  async getConnection(id: string, workspaceId: string): Promise<IOAuthConnection> {
    return this.getVisibleConnectionOrThrow(id, workspaceId);
  }

  async getConnectionHistory(id: string, workspaceId: string): Promise<IOAuthHistory[]> {
    await this.getVisibleConnectionOrThrow(id, workspaceId);
    return this.repository.findHistory(id);
  }

  async findAllConnections(workspaceId: string, filter: OAuthConnectionFilterDto): Promise<PaginatedOAuthConnectionResponseDto> {
    const [data, total] = await this.repository.findAllConnections(workspaceId, filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ══════════════════════════════════════════════════════════════════
  // Private helpers
  // ══════════════════════════════════════════════════════════════════

  private async upsertConnection(params: {
    client: IOAuthClient;
    scopeType: OAuthScopeType;
    workspaceId: string | null;
    organizationId: string | null;
    scopeKey: string;
    ownerUserId: string | null;
    serviceAccountHandle: string | null;
    externalAccountId: string | null;
    externalAccountLabel: string | null;
    grantedScopes: string[];
    grantType: OAuthGrantType;
    tokenResponse: ITokenResponse;
    actorId?: string;
  }): Promise<IOAuthConnection> {
    const existing = await this.repository.findConnectionByIdentity(params.client.id, params.scopeKey, params.externalAccountId);
    if (existing && existing.status === OAuthConnectionStatus.CONNECTED) {
      throw new OAuthConnectionAlreadyExistsException();
    }

    const fields = {
      status: OAuthConnectionStatus.CONNECTED,
      externalAccountLabel: params.externalAccountLabel,
      grantedScopes: params.grantedScopes,
      grantType: params.grantType,
      encryptedAccessToken: this.encryptor.encryptValue(params.tokenResponse.access_token, params.scopeKey),
      encryptedRefreshToken: params.tokenResponse.refresh_token ? this.encryptor.encryptValue(params.tokenResponse.refresh_token, params.scopeKey) : null,
      accessTokenExpiresAt: params.tokenResponse.expires_in ? new Date(Date.now() + params.tokenResponse.expires_in * 1000) : null,
      consentedAt: new Date(),
      consecutiveFailures: 0,
      lastFailureAt: null,
      lastFailureReason: null,
      revokedAt: null,
      revokedReason: null,
      disconnectedAt: null,
    };

    const connection = existing
      ? await this.repository.updateConnection(existing.id, fields)
      : await this.repository.createConnection({
          clientId: params.client.id,
          workspaceId: params.workspaceId,
          organizationId: params.organizationId,
          scopeType: params.scopeType,
          scopeKey: params.scopeKey,
          ownerUserId: params.ownerUserId,
          serviceAccountHandle: params.serviceAccountHandle,
          providerKey: params.client.providerKey,
          externalAccountId: params.externalAccountId,
          createdBy: params.actorId ?? null,
          ...fields,
        });

    await this.recordHistory(
      OAuthHistoryEntityType.CONNECTION,
      connection.id,
      connection.workspaceId,
      OAuthChangeType.CONNECTION_AUTHORIZED,
      existing?.status ?? null,
      OAuthConnectionStatus.CONNECTED,
      params.actorId ?? 'system',
      this.sanitizeConnectionForHistory(connection),
    );
    await this.recordAudit(connection.workspaceId ?? connection.organizationId ?? 'unknown', params.actorId ?? 'system', 'oauth-management.connection.authorized', AuditActionCategory.CREATE, connection.id);
    await this.publishEvent(OAuthManagementEvent.OAUTH_CONNECTION_AUTHORIZED, OAuthHistoryEntityType.CONNECTION, connection.id, connection.workspaceId, connection.scopeKey, params.actorId);

    return connection;
  }

  private async exchangeToken(client: IOAuthClient, params: Record<string, string>): Promise<ITokenResponse> {
    const body = new URLSearchParams(params);
    const response = await axios.post(client.tokenEndpoint, body.toString(), {
      timeout: OAUTH_REQUEST_TIMEOUT_MS,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      validateStatus: () => true,
    });

    if (response.status < 200 || response.status >= 300 || !response.data?.access_token) {
      const reason = response.data?.error_description ?? response.data?.error ?? `HTTP ${response.status}`;
      throw new Error(reason);
    }

    return response.data as ITokenResponse;
  }

  /** Best-effort — a failed/unsupported userinfo lookup never blocks the connection from being created. */
  private async fetchExternalAccount(client: IOAuthClient, accessToken: string): Promise<{ id: string | null; label: string | null } | null> {
    if (!client.userInfoEndpoint) {
      return null;
    }
    try {
      const response = await axios.get(client.userInfoEndpoint, {
        timeout: OAUTH_REQUEST_TIMEOUT_MS,
        headers: { Authorization: `Bearer ${accessToken}` },
        validateStatus: () => true,
      });
      if (response.status < 200 || response.status >= 300) {
        return null;
      }
      const data = response.data ?? {};
      const id = data.sub ?? data.id ?? data.user_id ?? data.email ?? null;
      const label = data.email ?? data.name ?? data.preferred_username ?? null;
      return id || label ? { id: id ? String(id) : null, label: label ? String(label) : null } : null;
    } catch {
      return null;
    }
  }

  private async attemptProviderRevocation(client: IOAuthClient, connection: IOAuthConnection): Promise<void> {
    if (!client.revocationEndpoint || !connection.encryptedAccessToken) {
      return;
    }
    const clientSecret = this.decryptor.decryptValue(client.encryptedClientSecret, client.scopeKey);
    const token = connection.encryptedRefreshToken
      ? this.decryptor.decryptValue(connection.encryptedRefreshToken, connection.scopeKey)
      : this.decryptor.decryptValue(connection.encryptedAccessToken, connection.scopeKey);
    const tokenTypeHint = connection.encryptedRefreshToken ? 'refresh_token' : 'access_token';

    await axios.post(
      client.revocationEndpoint,
      new URLSearchParams({ token, token_type_hint: tokenTypeHint, client_id: client.clientId, client_secret: clientSecret }).toString(),
      { timeout: OAUTH_REQUEST_TIMEOUT_MS, headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, validateStatus: () => true },
    );
  }

  private buildAuthorizationUrl(client: IOAuthClient, redirectUri: string, scopes: string[], state: string, nonce: string): string {
    const url = new URL(client.authorizationEndpoint);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', client.clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    if (scopes.length > 0) url.searchParams.set('scope', scopes.join(' '));
    url.searchParams.set('state', state);
    url.searchParams.set('nonce', nonce);
    return url.toString();
  }

  private async transitionClient(
    client: IOAuthClient,
    to: OAuthClientStatus,
    userId: string,
    changeType: OAuthChangeType,
    event: OAuthManagementEvent,
    reason?: string,
  ): Promise<IOAuthClient> {
    if (!CLIENT_TRANSITIONS[client.status]?.includes(to)) {
      throw new OAuthClientInvalidStateTransitionException(client.status, to);
    }

    const updated = await this.repository.updateClient(client.id, { status: to });
    await this.recordHistory(OAuthHistoryEntityType.CLIENT, client.id, client.workspaceId, changeType, client.status, to, userId, this.sanitizeClientForHistory(updated), reason);
    await this.recordAudit(
      client.workspaceId ?? client.organizationId ?? 'unknown',
      userId,
      `oauth-management.client.${changeType.toLowerCase()}`,
      AuditActionCategory.UPDATE,
      client.id,
      AuditRiskLevel.SUSPICIOUS,
    );
    await this.publishEvent(event, OAuthHistoryEntityType.CLIENT, client.id, updated.workspaceId, updated.scopeKey, userId, reason ? { reason } : undefined);
    return updated;
  }

  private async transitionConnection(
    connection: IOAuthConnection,
    to: OAuthConnectionStatus,
    userId: string,
    changeType: OAuthChangeType,
    event: OAuthManagementEvent,
    reason: string | undefined,
    extraFields: Partial<IOAuthConnection>,
  ): Promise<IOAuthConnection> {
    if (!CONNECTION_TRANSITIONS[connection.status]?.includes(to)) {
      throw new OAuthConnectionInvalidStateTransitionException(connection.status, to);
    }

    const updated = await this.repository.updateConnection(connection.id, { status: to, ...extraFields });
    await this.recordHistory(OAuthHistoryEntityType.CONNECTION, connection.id, connection.workspaceId, changeType, connection.status, to, userId === 'system' ? null : userId, this.sanitizeConnectionForHistory(updated), reason);
    await this.recordAudit(
      connection.workspaceId ?? connection.organizationId ?? 'unknown',
      userId,
      `oauth-management.connection.${changeType.toLowerCase()}`,
      AuditActionCategory.UPDATE,
      connection.id,
      AuditRiskLevel.SUSPICIOUS,
    );
    await this.publishEvent(event, OAuthHistoryEntityType.CONNECTION, connection.id, updated.workspaceId, updated.scopeKey, userId === 'system' ? undefined : userId, reason ? { reason } : undefined);
    return updated;
  }

  private async assertCanManage(workspaceId: string, userId: string, userRole: string): Promise<void> {
    if (OAUTH_MANAGE_ROLES.includes(userRole)) {
      return;
    }
    const hasGranularRole = await this.rolesPermissionsService.userHasActiveRole(workspaceId, userId, 'ADMIN');
    if (!hasGranularRole) {
      throw new OAuthAccessDeniedException();
    }
  }

  private async assertCanManageConnection(connection: IOAuthConnection, userId: string, userRole: string): Promise<void> {
    if (connection.scopeType === OAuthScopeType.USER && connection.ownerUserId === userId) {
      return;
    }
    if (OAUTH_MANAGE_ROLES.includes(userRole)) {
      return;
    }
    if (connection.workspaceId) {
      const hasGranularRole = await this.rolesPermissionsService.userHasActiveRole(connection.workspaceId, userId, 'ADMIN');
      if (hasGranularRole) return;
    }
    throw new OAuthAccessDeniedException();
  }

  private assertClientActive(client: IOAuthClient): void {
    if (client.status !== OAuthClientStatus.ACTIVE) {
      throw new OAuthClientInactiveException();
    }
  }

  private assertValidEndpoint(endpoint: string): void {
    try {
      const parsed = new URL(endpoint);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('unsupported protocol');
      }
    } catch {
      throw new OAuthClientInvalidDefinitionException(`'${endpoint}' is not a valid endpoint URL`);
    }
  }

  private async getVisibleClientOrThrow(id: string, workspaceId: string, organizationId?: string): Promise<IOAuthClient> {
    const client = await this.repository.findClientById(id);
    const visible = !!client && (client.workspaceId === workspaceId || (!!organizationId && client.organizationId === organizationId));
    if (!client || !visible) {
      throw new OAuthClientNotFoundException(id);
    }
    return client;
  }

  private async getVisibleConnectionOrThrow(id: string, workspaceId: string, organizationId?: string): Promise<IOAuthConnection> {
    const connection = await this.repository.findConnectionById(id);
    const visible = !!connection && (connection.workspaceId === workspaceId || (!!organizationId && connection.organizationId === organizationId));
    if (!connection || !visible) {
      throw new OAuthConnectionNotFoundException(id);
    }
    return connection;
  }

  /** Snapshots never include `encryptedClientSecret` — history is inspectable by workspace admins and must never leak secret material either. */
  private sanitizeClientForHistory(client: IOAuthClient): Record<string, unknown> {
    const { encryptedClientSecret: _encryptedClientSecret, ...safe } = client;
    return safe;
  }

  /** Snapshots never include encrypted token material. */
  private sanitizeConnectionForHistory(connection: IOAuthConnection): Record<string, unknown> {
    const { encryptedAccessToken: _encryptedAccessToken, encryptedRefreshToken: _encryptedRefreshToken, ...safe } = connection;
    return safe;
  }

  private async recordHistory(
    entityType: OAuthHistoryEntityType,
    entityId: string,
    workspaceId: string | null,
    changeType: OAuthChangeType,
    fromStatus: string | null,
    toStatus: string | null,
    changedBy: string | null,
    snapshot: Record<string, unknown>,
    reason?: string,
  ): Promise<void> {
    await this.repository.createHistory({ entityType, entityId, workspaceId, changeType, fromStatus, toStatus, reason: reason ?? null, changedBy, snapshot: snapshot as any });
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
      module: OAUTH_MANAGEMENT_MODULE,
      entityType: 'OAuth',
      entityId,
      outcome: ActivityOutcome.SUCCESS,
      riskLevel,
    });
  }

  private async publishEvent(
    event: OAuthManagementEvent,
    entityType: OAuthHistoryEntityType,
    entityId: string,
    workspaceId?: string | null,
    scopeKey?: string,
    actorId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.eventQueue.publish({ event, entityType, entityId, workspaceId, scopeKey, actorId, metadata });
  }
}
