-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('rss_blog', 'rss_newsletter', 'github');

-- CreateTable
CREATE TABLE "builders" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "short_bio" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "builders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "builder_sources" (
    "id" TEXT NOT NULL,
    "builder_id" TEXT NOT NULL,
    "source_type" "SourceType" NOT NULL,
    "source_identifier" TEXT NOT NULL,
    "last_fetched_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "builder_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_items" (
    "id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "raw_content" TEXT,
    "published_at" TIMESTAMP(3) NOT NULL,
    "content_hash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processed_items" (
    "id" TEXT NOT NULL,
    "content_item_id" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "why_it_matters" TEXT,
    "what_to_try" TEXT,
    "scores_json" JSONB NOT NULL,
    "overall_score" DOUBLE PRECISION NOT NULL,
    "priority_flags" TEXT[],
    "confidence" DOUBLE PRECISION,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_intelligence" (
    "id" TEXT NOT NULL,
    "week_start" TIMESTAMP(3) NOT NULL,
    "top_items_json" TEXT NOT NULL,
    "trend_summary" TEXT NOT NULL,
    "strategic_experiments" TEXT NOT NULL,
    "published_to_slack" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_intelligence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL DEFAULT 'settings',
    "automation_enabled" BOOLEAN NOT NULL DEFAULT true,
    "manual_override" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "content_items_url_key" ON "content_items"("url");

-- CreateIndex
CREATE UNIQUE INDEX "content_items_content_hash_key" ON "content_items"("content_hash");

-- CreateIndex
CREATE INDEX "content_items_published_at_idx" ON "content_items"("published_at");

-- CreateIndex
CREATE INDEX "content_items_status_idx" ON "content_items"("status");

-- CreateIndex
CREATE UNIQUE INDEX "processed_items_content_item_id_key" ON "processed_items"("content_item_id");

-- CreateIndex
CREATE INDEX "processed_items_overall_score_idx" ON "processed_items"("overall_score");

-- CreateIndex
CREATE INDEX "processed_items_priority_flags_idx" ON "processed_items" USING GIN ("priority_flags");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_intelligence_week_start_key" ON "weekly_intelligence"("week_start");

-- AddForeignKey
ALTER TABLE "builder_sources" ADD CONSTRAINT "builder_sources_builder_id_fkey" FOREIGN KEY ("builder_id") REFERENCES "builders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "builder_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processed_items" ADD CONSTRAINT "processed_items_content_item_id_fkey" FOREIGN KEY ("content_item_id") REFERENCES "content_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
