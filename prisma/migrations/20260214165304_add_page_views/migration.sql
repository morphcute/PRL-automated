/*
  Warnings:

  - You are about to drop the column `error` on the `SyncRun` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SyncRun" DROP COLUMN "error";

-- CreateTable
CREATE TABLE "PageView" (
    "id" TEXT NOT NULL,
    "page" TEXT NOT NULL,
    "date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "count" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PageView_date_idx" ON "PageView"("date");

-- CreateIndex
CREATE UNIQUE INDEX "PageView_page_date_key" ON "PageView"("page", "date");
