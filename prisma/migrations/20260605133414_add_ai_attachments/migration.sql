-- CreateEnum
CREATE TYPE "AiAttachmentKind" AS ENUM ('IMAGE', 'DOCUMENT');

-- CreateTable
CREATE TABLE "ai_attachments" (
    "id" TEXT NOT NULL,
    "ai_message_id" TEXT,
    "landing_page_message_id" TEXT,
    "kind" "AiAttachmentKind" NOT NULL,
    "filename" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storage_key" TEXT NOT NULL,
    "extracted_text" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_attachments_ai_message_id_idx" ON "ai_attachments"("ai_message_id");

-- CreateIndex
CREATE INDEX "ai_attachments_landing_page_message_id_idx" ON "ai_attachments"("landing_page_message_id");

-- AddForeignKey
ALTER TABLE "ai_attachments" ADD CONSTRAINT "ai_attachments_ai_message_id_fkey" FOREIGN KEY ("ai_message_id") REFERENCES "ai_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_attachments" ADD CONSTRAINT "ai_attachments_landing_page_message_id_fkey" FOREIGN KEY ("landing_page_message_id") REFERENCES "landing_page_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
