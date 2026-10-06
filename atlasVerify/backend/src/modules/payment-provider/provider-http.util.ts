import { PROVIDER_REQUEST_TIMEOUT_MS } from './constants';

export interface IProviderHttpRequest {
  url: string;
  method: 'GET' | 'POST';
  headers: Record<string, string>;
  body?: string;
  timeoutMs?: number;
}

export interface IProviderHttpResponse {
  status: number;
  ok: boolean;
  json: Record<string, unknown>;
  raw: string;
}

/**
 * Generic HTTP-with-timeout helper shared by every adapter — no
 * provider-specific auth/parsing lives here, only the timeout plumbing so
 * each adapter isn't reimplementing `AbortController` wiring.
 */
export async function providerHttpRequest(request: IProviderHttpRequest): Promise<IProviderHttpResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), request.timeoutMs ?? PROVIDER_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      signal: controller.signal,
    });

    const raw = await response.text();
    let json: Record<string, unknown> = {};
    try {
      json = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    } catch {
      json = {};
    }

    return { status: response.status, ok: response.ok, json, raw };
  } finally {
    clearTimeout(timeout);
  }
}
