-- CreateTable
CREATE TABLE "EventLog" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "folio" TEXT,
    "payload" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderFact" (
    "orderId" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "medioId" TEXT,
    "urgencia" TEXT NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "distanciaKm" DOUBLE PRECISION NOT NULL,
    "fechaLimite" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "assignedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "aTiempo" BOOLEAN,
    "minutosEntrega" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderFact_pkey" PRIMARY KEY ("orderId")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "userId" TEXT,
    "rol" TEXT,
    "metodo" TEXT NOT NULL,
    "ruta" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "duracionMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptimizationFact" (
    "runId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "asignados" INTEGER NOT NULL,
    "costoTotal" DOUBLE PRECISION NOT NULL,
    "mejoraPct" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OptimizationFact_pkey" PRIMARY KEY ("runId")
);

-- CreateIndex
CREATE INDEX "EventLog_occurredAt_idx" ON "EventLog"("occurredAt");

-- CreateIndex
CREATE INDEX "EventLog_type_occurredAt_idx" ON "EventLog"("type", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrderFact_folio_key" ON "OrderFact"("folio");

-- CreateIndex
CREATE INDEX "OrderFact_createdAt_idx" ON "OrderFact"("createdAt");

-- CreateIndex
CREATE INDEX "OrderFact_status_idx" ON "OrderFact"("status");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

