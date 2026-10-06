-- CreateTable
CREATE TABLE "marketplace_queue_configs" (
    "id" TEXT NOT NULL,
    "queue_name" TEXT NOT NULL,
    "queue_type" TEXT NOT NULL,
    "concurrency" INTEGER NOT NULL DEFAULT 5,
    "rate_limit" JSONB,
    "default_job_options" JSONB,
    "enable_metrics" BOOLEAN NOT NULL DEFAULT true,
    "enable_dead_letter" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_queue_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_job_metadata" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "queue_name" TEXT NOT NULL,
    "queue_type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "account_id" TEXT,
    "state" TEXT NOT NULL DEFAULT 'WAITING',
    "priority" INTEGER NOT NULL,
    "attempts" INTEGER NOT NULL,
    "max_attempts" INTEGER NOT NULL,
    "progress" INTEGER,
    "payload" JSONB NOT NULL,
    "idempotency_key" TEXT,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "failed_reason" TEXT,
    "stacktrace" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_job_metadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_job_history" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "queue_name" TEXT NOT NULL,
    "queue_type" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "message" TEXT,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_job_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_dead_letter_jobs" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "queue_name" TEXT NOT NULL,
    "queue_type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "account_id" TEXT,
    "original_job_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "failed_reason" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL,
    "failed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_reprocessed" BOOLEAN NOT NULL DEFAULT false,
    "reprocessed_at" TIMESTAMP(3),

    CONSTRAINT "marketplace_dead_letter_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_queue_rate_limits" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "account_id" TEXT NOT NULL DEFAULT '',
    "queue_type" TEXT NOT NULL,
    "max_concurrent" INTEGER NOT NULL,
    "max_per_minute" INTEGER NOT NULL,
    "max_per_hour" INTEGER NOT NULL,
    "is_enabled" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_queue_rate_limits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_queue_configs_queue_name_key" ON "marketplace_queue_configs"("queue_name");

-- CreateIndex
CREATE INDEX "marketplace_job_metadata_workspace_id_idx" ON "marketplace_job_metadata"("workspace_id");

-- CreateIndex
CREATE INDEX "marketplace_job_metadata_workspace_id_queue_name_idx" ON "marketplace_job_metadata"("workspace_id", "queue_name");

-- CreateIndex
CREATE INDEX "marketplace_job_metadata_workspace_id_queue_type_state_idx" ON "marketplace_job_metadata"("workspace_id", "queue_type", "state");

-- CreateIndex
CREATE INDEX "marketplace_job_metadata_queue_type_state_processed_at_idx" ON "marketplace_job_metadata"("queue_type", "state", "processed_at");

-- CreateIndex
CREATE INDEX "marketplace_job_metadata_workspace_id_queue_type_finished_a_idx" ON "marketplace_job_metadata"("workspace_id", "queue_type", "finished_at");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_job_metadata_workspace_id_idempotency_key_key" ON "marketplace_job_metadata"("workspace_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "marketplace_job_history_workspace_id_job_id_timestamp_idx" ON "marketplace_job_history"("workspace_id", "job_id", "timestamp");

-- CreateIndex
CREATE INDEX "marketplace_dead_letter_jobs_workspace_id_is_reprocessed_fa_idx" ON "marketplace_dead_letter_jobs"("workspace_id", "is_reprocessed", "failed_at");

-- CreateIndex
CREATE INDEX "marketplace_dead_letter_jobs_workspace_id_queue_type_is_rep_idx" ON "marketplace_dead_letter_jobs"("workspace_id", "queue_type", "is_reprocessed");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_queue_rate_limits_workspace_id_provider_account_key" ON "marketplace_queue_rate_limits"("workspace_id", "provider", "account_id", "queue_type");
