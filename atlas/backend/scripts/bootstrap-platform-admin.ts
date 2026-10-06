/**
 * ATLAS — First Platform Admin Bootstrap
 * ----------------------------------------------------------------
 * A trusted, OPERATOR-ONLY script for creating or promoting the very
 * first ATLAS platform admin. This is intentionally NOT an HTTP
 * endpoint and is never imported by, or wired into, the running
 * application (`AppModule`, any controller, guard, or service).
 *
 * `isPlatformAdmin` is deliberately kept out of every public code
 * path: `POST /auth/register` always creates `role: OWNER`,
 * `isPlatformAdmin: false` (see
 * `src/modules/authentication/authentication.repository.ts`), and no
 * DTO/controller anywhere accepts `isPlatformAdmin` as input. This
 * script — run manually from a trusted shell — is the only supported
 * way to set that flag outside of a direct database write.
 * `PlatformAdminGuard` and the `tenant-isolation` module's
 * `@AllowPlatformAdmin()` bypass both simply read the flag this
 * script sets; neither is touched here.
 *
 * Usage (never executed automatically by this change):
 *   PLATFORM_ADMIN_EMAIL=... \
 *   PLATFORM_ADMIN_PASSWORD=... \
 *   PLATFORM_ADMIN_FIRST_NAME=... \
 *   PLATFORM_ADMIN_LAST_NAME=... \
 *   PLATFORM_ADMIN_WORKSPACE_NAME=... \
 *   npm run bootstrap:platform-admin
 *
 * Behavior summary:
 *   - Refuses to run if any required env var is missing.
 *   - Refuses to create a SECOND platform admin under a different
 *     email — this script only ever maintains a single platform
 *     admin identity.
 *   - If the target email already belongs to a platform admin: no-op,
 *     exits 0.
 *   - If the target email belongs to an existing (non-platform-admin)
 *     user: promotes ONLY `isPlatformAdmin` — role/workspace/password
 *     are left untouched.
 *   - If the target email does not exist: creates a dedicated
 *     workspace + user using the exact same fields/defaults as public
 *     registration (`AuthenticationRepository.createUserWithWorkspace`),
 *     with `isPlatformAdmin: true` added.
 *   - Password hashing reuses `bcryptjs` + the same
 *     `AUTH_CONSTANTS.BCRYPT_SALT_ROUNDS` used by
 *     `AuthenticationService` — no second hashing algorithm.
 *   - New-account input is validated with the exact same `RegisterDto`
 *     (class-validator) rules public registration enforces, so the
 *     bootstrap account can never be weaker than a normal signup.
 */

import 'reflect-metadata';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from '@prisma/client';
import { validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { AUTH_CONSTANTS } from '../src/modules/authentication/constants';
import { RegisterDto } from '../src/modules/authentication/dto';
import { slugify, maskEmail } from '../src/common/utils';

// ── Env loading ──────────────────────────────────────────────────
// Mirrors ConfigurationModule's precedence (`.env` → `.env.{NODE_ENV}`
// → `.env.local`, later wins) so this script sees the same
// `DATABASE_URL` etc. the running app would, without depending on
// Nest's DI container.
for (const file of ['.env', `.env.${process.env['NODE_ENV'] ?? 'development'}`, '.env.local']) {
  dotenv.config({ path: path.resolve(__dirname, '..', file), override: true });
}

const REQUIRED_ENV_VARS = [
  'PLATFORM_ADMIN_EMAIL',
  'PLATFORM_ADMIN_PASSWORD',
  'PLATFORM_ADMIN_FIRST_NAME',
  'PLATFORM_ADMIN_LAST_NAME',
  'PLATFORM_ADMIN_WORKSPACE_NAME',
] as const;

type RequiredEnvVar = (typeof REQUIRED_ENV_VARS)[number];

function readRequiredEnv(): Record<RequiredEnvVar, string> {
  const missing: RequiredEnvVar[] = [];
  const values = {} as Record<RequiredEnvVar, string>;

  for (const key of REQUIRED_ENV_VARS) {
    const value = process.env[key];
    if (!value || !value.trim()) {
      missing.push(key);
    } else {
      values[key] = value;
    }
  }

  if (missing.length > 0) {
    console.error('✖ Missing required environment variable(s):');
    for (const key of missing) console.error(`  - ${key}`);
    console.error('\nSet these and re-run. See .env.example for the expected variable names.');
    console.error('Nothing was read from or written to the database.');
    process.exit(1);
  }

  return values;
}

/**
 * Reuses `RegisterDto`'s exact class-validator rules (name lengths,
 * email format, password strength) rather than re-implementing them —
 * so the bootstrap account is held to the identical contract as a
 * normal `POST /auth/register` signup. Only called on the
 * create-new-user path; promoting an existing user never re-validates
 * fields it isn't changing.
 *
 * Throws (rather than exiting directly) so callers already inside a
 * `try`/`finally` around an open Prisma connection get a clean
 * disconnect before the process exits.
 */
function assertMeetsRegistrationRules(input: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  workspaceName: string;
}): void {
  const dto = plainToInstance(RegisterDto, input);
  const errors = validateSync(dto);

  if (errors.length > 0) {
    const messages = errors.flatMap((error) => Object.values(error.constraints ?? {}));
    throw new Error(
      `PLATFORM_ADMIN_* values do not satisfy the same validation rules as public registration:\n${messages.map((m) => `  - ${m}`).join('\n')}`,
    );
  }
}

async function main(): Promise<void> {
  const env = readRequiredEnv();

  const email = env.PLATFORM_ADMIN_EMAIL.toLowerCase().trim();
  const firstName = env.PLATFORM_ADMIN_FIRST_NAME.trim();
  const lastName = env.PLATFORM_ADMIN_LAST_NAME.trim();
  const workspaceName = env.PLATFORM_ADMIN_WORKSPACE_NAME.trim();
  const password = env.PLATFORM_ADMIN_PASSWORD;

  const prisma = new PrismaClient();

  try {
    // ── Safety check: never create a second platform admin ────────
    const existingPlatformAdmin = await prisma.user.findFirst({
      where: { isPlatformAdmin: true, deletedAt: null },
    });

    if (existingPlatformAdmin && existingPlatformAdmin.email !== email) {
      console.error('✖ A platform admin already exists with a different email:');
      console.error(`  ${maskEmail(existingPlatformAdmin.email)} (user id: ${existingPlatformAdmin.id})`);
      console.error('\nThis script maintains a single platform admin identity and will not');
      console.error('silently create a second one. Nothing was changed.');
      process.exitCode = 1;
      return;
    }

    // ── Existing user? Promote only, or no-op if already done ─────
    const existingUser = await prisma.user.findFirst({
      where: { email, deletedAt: null },
    });

    if (existingUser) {
      if (existingUser.isPlatformAdmin) {
        console.log(`✔ Platform admin already exists — nothing to do.`);
        console.log(`  user id: ${existingUser.id}, email: ${maskEmail(existingUser.email)}`);
        return;
      }

      const promoted = await prisma.user.update({
        where: { id: existingUser.id },
        data: { isPlatformAdmin: true },
      });

      console.log('✔ Promoted existing user to platform admin.');
      console.log(`  user id: ${promoted.id}, email: ${maskEmail(promoted.email)}`);
      console.log(`  Existing role (${promoted.role}) and workspace (${promoted.workspaceId}) were left unchanged.`);
      return;
    }

    // ── No existing user: create workspace + user ──────────────────
    assertMeetsRegistrationRules({ firstName, lastName, email, password, workspaceName });

    const passwordHash = await bcrypt.hash(password, AUTH_CONSTANTS.BCRYPT_SALT_ROUNDS);

    // Same unique-slug pattern as AuthenticationService.register().
    const baseSlug = slugify(workspaceName);
    const workspaceSlug = `${baseSlug}-${uuidv4().split('-')[0]}`;

    const created = await prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name: workspaceName,
          slug: workspaceSlug,
          status: 'ACTIVE',
          plan: 'FREE',
        },
      });

      const user = await tx.user.create({
        data: {
          workspaceId: workspace.id,
          email,
          firstName,
          lastName,
          passwordHash,
          role: 'OWNER',
          status: 'ACTIVE',
          isPlatformAdmin: true,
        },
      });

      return { workspace, user };
    });

    console.log('✔ Created first platform admin.');
    console.log(`  user id: ${created.user.id}, email: ${maskEmail(created.user.email)}`);
    console.log(`  workspace: ${created.workspace.name} (${created.workspace.slug})`);
    console.log('  role: OWNER, status: ACTIVE, isPlatformAdmin: true');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('✖ Bootstrap failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
