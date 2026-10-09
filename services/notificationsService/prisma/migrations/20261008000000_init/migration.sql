-- CreateEnum
CREATE TYPE "Audience" AS ENUM ('USUARIO', 'ADMINS');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('PENDIENTE', 'ENVIADO', 'FALLIDO');

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "audience" "Audience" NOT NULL DEFAULT 'USUARIO',
    "userId" TEXT,
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "folio" TEXT,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'PENDIENTE',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "nextRetryAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "driver" TEXT,
    "eventId" TEXT,
    "folio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedEvent" (
    "eventId" TEXT NOT NULL,
    "consumer" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedEvent_pkey" PRIMARY KEY ("eventId","consumer")
);

-- CreateIndex
CREATE INDEX "Notification_userId_leida_createdAt_idx" ON "Notification"("userId", "leida", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_audience_createdAt_idx" ON "Notification"("audience", "createdAt");

-- CreateIndex
CREATE INDEX "EmailLog_status_nextRetryAt_idx" ON "EmailLog"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX "EmailLog_createdAt_idx" ON "EmailLog"("createdAt");

