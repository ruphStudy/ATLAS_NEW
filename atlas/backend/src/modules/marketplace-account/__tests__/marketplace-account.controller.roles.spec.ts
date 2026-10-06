import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard, RolesGuard } from '@common/guards';
import { MarketplaceAccountController } from '../marketplace-account.controller';

/**
 * Regression coverage for the MarketplaceAccountController RBAC gap found in
 * the Amazon SP-API security audit: write operations that connect, mutate,
 * or remove a seller account (Amazon Information) were reachable by any
 * authenticated workspace member, regardless of role. These tests exercise
 * the real RolesGuard against the controller's actual decorated methods —
 * no NestJS TestingModule needed since RolesGuard only reads
 * Reflector-visible metadata off the handler/class.
 */
function makeContext(handler: (...args: unknown[]) => unknown, role?: string): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => MarketplaceAccountController,
    switchToHttp: () => ({
      getRequest: () => (role ? { user: { role } } : {}),
    }),
  } as unknown as ExecutionContext;
}

const READ_METHODS = ['findAll', 'findById', 'getHistory'] as const;
const WRITE_ROLES_METHODS = [
  'update',
  'enable',
  'disable',
  'archive',
  'restore',
  'testConnection',
  'setDefault',
  'setPriority',
] as const;
const ADMIN_ONLY_METHODS = ['create', 'delete'] as const;

describe('MarketplaceAccountController — RolesGuard wiring', () => {
  const guard = new RolesGuard(new Reflector());
  const proto = MarketplaceAccountController.prototype as unknown as Record<
    string,
    (...args: unknown[]) => unknown
  >;

  it('applies JwtAuthGuard + RolesGuard at the controller level', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, MarketplaceAccountController) as unknown[];
    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(RolesGuard);
  });

  it('leaves read endpoints unrestricted by role — any authenticated member can list/view/check history', () => {
    for (const method of READ_METHODS) {
      expect(guard.canActivate(makeContext(proto[method]!, 'VIEWER'))).toBe(true);
    }
  });

  it('restricts create and delete to ADMIN only', () => {
    for (const method of ADMIN_ONLY_METHODS) {
      expect(guard.canActivate(makeContext(proto[method]!, 'ADMIN'))).toBe(true);
      expect(() => guard.canActivate(makeContext(proto[method]!, 'OPERATOR'))).toThrow(
        ForbiddenException,
      );
      expect(() => guard.canActivate(makeContext(proto[method]!, 'VIEWER'))).toThrow(
        ForbiddenException,
      );
    }
  });

  it('allows ADMIN and OPERATOR, blocks VIEWER/ANALYST/MANAGER, for account state-changing writes', () => {
    for (const method of WRITE_ROLES_METHODS) {
      expect(guard.canActivate(makeContext(proto[method]!, 'ADMIN'))).toBe(true);
      expect(guard.canActivate(makeContext(proto[method]!, 'OPERATOR'))).toBe(true);
      expect(() => guard.canActivate(makeContext(proto[method]!, 'VIEWER'))).toThrow(
        ForbiddenException,
      );
      expect(() => guard.canActivate(makeContext(proto[method]!, 'ANALYST'))).toThrow(
        ForbiddenException,
      );
      expect(() => guard.canActivate(makeContext(proto[method]!, 'MANAGER'))).toThrow(
        ForbiddenException,
      );
    }
  });

  it('OWNER always passes regardless of the @Roles list, including on ADMIN-only endpoints', () => {
    expect(guard.canActivate(makeContext(proto.create!, 'OWNER'))).toBe(true);
    expect(guard.canActivate(makeContext(proto.delete!, 'OWNER'))).toBe(true);
    expect(guard.canActivate(makeContext(proto.enable!, 'OWNER'))).toBe(true);
  });

  it('rejects a role-gated request with no authenticated user', () => {
    expect(() => guard.canActivate(makeContext(proto.create!, undefined))).toThrow(
      UnauthorizedException,
    );
  });
});
