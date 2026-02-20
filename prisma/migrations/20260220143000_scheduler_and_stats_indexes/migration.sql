-- Improve query performance for scheduler checks and stats endpoints.
CREATE INDEX "SyncJob_userId_idx" ON "SyncJob"("userId");
CREATE INDEX "SyncJob_name_userId_idx" ON "SyncJob"("name", "userId");
CREATE INDEX "SyncJob_isEnabled_cronEnabled_runMode_idx" ON "SyncJob"("isEnabled", "cronEnabled", "runMode");
CREATE INDEX "SyncJob_startAt_idx" ON "SyncJob"("startAt");
CREATE INDEX "SyncJob_endAt_idx" ON "SyncJob"("endAt");
CREATE INDEX "SyncJob_lastRunAt_idx" ON "SyncJob"("lastRunAt");

CREATE INDEX "SyncRun_jobId_idx" ON "SyncRun"("jobId");
CREATE INDEX "SyncRun_jobId_startedAt_idx" ON "SyncRun"("jobId", "startedAt");
CREATE INDEX "SyncRun_jobId_status_idx" ON "SyncRun"("jobId", "status");
CREATE INDEX "SyncRun_status_startedAt_idx" ON "SyncRun"("status", "startedAt");
