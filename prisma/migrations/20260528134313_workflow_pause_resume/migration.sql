-- AlterEnum
ALTER TYPE "WorkflowRunStatus" ADD VALUE 'WAITING';

-- AlterTable
ALTER TABLE "workflow_runs" ADD COLUMN     "state" JSONB,
ADD COLUMN     "waiting_step_id" TEXT;
