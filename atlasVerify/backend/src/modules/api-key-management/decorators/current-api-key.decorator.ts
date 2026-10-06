import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IApiKey } from '../interfaces';

interface IRequestWithApiKey {
  apiKey?: IApiKey;
}

/**
 * Reads the validated `IApiKey` off the request (set by `ApiKeyGuard`).
 * Only ever populated on routes that apply `ApiKeyGuard` — never leaks
 * `secretHash`-bearing data into a response; callers must map to
 * `ApiKeyResponseDto` themselves if returning anything to the client.
 */
export const CurrentApiKey = createParamDecorator((_data: unknown, ctx: ExecutionContext): IApiKey | undefined => {
  const request = ctx.switchToHttp().getRequest<IRequestWithApiKey>();
  return request.apiKey;
});
