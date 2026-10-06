-- AlterTable
ALTER TABLE "users" ADD COLUMN     "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mfa_enabled_at" TIMESTAMP(3),
ADD COLUMN     "mfa_secret" TEXT,
ADD COLUMN     "password_changed_at" TIMESTAMP(3);

-- Backfill: Amazon SP-API Developer Profile compliance requires a known
-- password-age baseline for every existing user. Backfilled to the
-- migration's own run time (NOW()), not `created_at` — an account created
-- years ago should not be treated as already password-expired the moment
-- this migration runs.
UPDATE "users" SET "password_changed_at" = NOW() WHERE "password_changed_at" IS NULL;
