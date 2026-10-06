import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AccountFilterQueryDto } from '../dto';

/**
 * Mirrors the exact global ValidationPipe options in main.ts
 * (whitelist + forbidNonWhitelisted + implicit conversion) so this test
 * reproduces the real "property X should not exist" failure mode instead of
 * a looser approximation of it.
 */
async function validateQuery(raw: Record<string, unknown>) {
  const instance = plainToInstance(AccountFilterQueryDto, raw, { enableImplicitConversion: true });
  return validate(instance, { whitelist: true, forbidNonWhitelisted: true });
}

describe('AccountFilterQueryDto — list endpoint query validation', () => {
  it('accepts the exact params the frontend sends (page, limit, search, status)', async () => {
    const errors = await validateQuery({ page: '1', limit: '20', search: 'amazon', status: 'ACTIVE' });
    expect(errors).toHaveLength(0);
  });

  it('accepts the full optional filter set with no errors', async () => {
    const errors = await validateQuery({
      page: '2',
      limit: '50',
      search: 'seller',
      status: 'ACTIVE',
      providerKey: 'AMAZON',
      marketplaceKey: 'AMAZON',
      country: 'US',
      isDefault: 'true',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects a client-supplied workspaceId — workspace identity must come from auth context, never the query string', async () => {
    const errors = await validateQuery({ page: '1', limit: '20', workspaceId: 'attacker-workspace' });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'workspaceId')).toBe(true);
  });

  it('still rejects a genuinely unknown query param', async () => {
    const errors = await validateQuery({ page: '1', bogusParam: 'x' });
    expect(errors.some((e) => e.property === 'bogusParam')).toBe(true);
  });
});
