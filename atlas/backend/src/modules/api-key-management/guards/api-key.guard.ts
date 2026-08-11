import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ApiKeyManagementService } from '../api-key-management.service';
import { IApiKey } from '../interfaces';
import { ApiKeyInvalidException } from '../exceptions/api-key-management.exceptions';

interface IRequestForApiKeyGuard {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: { remoteAddress?: string };
  apiKey?: IApiKey;
  user?: { sub: string; workspaceId: string; role: string };
}

/**
 * Opt-in alternative to the global `JwtAuthGuard` for programmatic/
 * server-to-server access — apply with `@UseGuards(ApiKeyGuard)` on routes
 * that should accept an API key (those routes must also be `@Public()` so
 * the global JWT guard doesn't reject the request first). On success,
 * populates `request.apiKey` (for `@CurrentApiKey()`) AND `request.user`
 * in the same shape the JWT strategy produces, so `@WorkspaceId()`/
 * `@UserId()`/`@UserRole()` keep working transparently. `role` is always
 * the sentinel `'API_KEY'` — deliberately NOT one of the legacy
 * OWNER/ADMIN/MANAGER/ANALYST/VIEWER values, so any privileged legacy
 * role check fails closed for API-key-authenticated requests unless a
 * route explicitly accounts for it.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeyManagementService: ApiKeyManagementService) {}

  async canActivate(executionContext: ExecutionContext): Promise<boolean> {
    const request = executionContext.switchToHttp().getRequest<IRequestForApiKeyGuard>();
    const rawKey = this.extractKey(request);
    if (!rawKey) {
      throw new ApiKeyInvalidException('No API key was supplied');
    }

    const ipAddress = request.ip ?? request.socket?.remoteAddress;
    const apiKey = await this.apiKeyManagementService.assertValidApiKey(rawKey, { ipAddress });

    request.apiKey = apiKey;
    request.user = {
      sub: apiKey.ownerUserId ?? apiKey.serviceAccountHandle ?? apiKey.id,
      workspaceId: apiKey.workspaceId ?? '',
      role: 'API_KEY',
    };

    return true;
  }

  private extractKey(request: IRequestForApiKeyGuard): string | null {
    const apiKeyHeader = request.headers['x-api-key'];
    if (typeof apiKeyHeader === 'string' && apiKeyHeader.length > 0) {
      return apiKeyHeader;
    }

    const authHeader = request.headers.authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      return authHeader.slice('Bearer '.length);
    }

    return null;
  }
}
