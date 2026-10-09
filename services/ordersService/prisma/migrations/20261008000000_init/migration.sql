-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDIENTE_PAGO', 'PAGADO', 'ASIGNADO', 'RECOLECTADO', 'EN_CAMINO', 'ENTREGADO', 'CANCELADO', 'FALLIDO');

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "clienteId" TEXT NOT NULL,
    "clienteNombre" TEXT NOT NULL,
    "clienteEmail" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDIENTE_PAGO',
    "origenDireccion" TEXT NOT NULL,
    "origenLat" DOUBLE PRECISION NOT NULL,
    "origenLng" DOUBLE PRECISION NOT NULL,
    "origenLugarId" TEXT,
    "destinoDireccion" TEXT NOT NULL,
    "destinoLat" DOUBLE PRECISION NOT NULL,
    "destinoLng" DOUBLE PRECISION NOT NULL,
    "destinoLugarId" TEXT,
    "destinatarioNombre" TEXT NOT NULL,
    "destinatarioTelefono" TEXT,
    "pesoKg" DOUBLE PRECISION NOT NULL,
    "largoCm" DOUBLE PRECISION NOT NULL,
    "anchoCm" DOUBLE PRECISION NOT NULL,
    "altoCm" DOUBLE PRECISION NOT NULL,
    "volumenL" DOUBLE PRECISION NOT NULL,
    "fragil" BOOLEAN NOT NULL DEFAULT false,
    "urgencia" TEXT NOT NULL,
    "fechaLimite" TIMESTAMP(3) NOT NULL,
    "extras" TEXT[],
    "valorDeclarado" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notas" TEXT,
    "medioPreferido" TEXT,
    "medioId" TEXT,
    "repartidorId" TEXT,
    "repartidorNombre" TEXT,
    "sugerenciaMedio" TEXT,
    "sugerenciaMotivo" TEXT,
    "sugerenciaProveedor" TEXT,
    "sugerenciaConfianza" DOUBLE PRECISION,
    "distanciaKm" DOUBLE PRECISION NOT NULL,
    "minutosEstimados" DOUBLE PRECISION NOT NULL,
    "etaMinutos" DOUBLE PRECISION,
    "polilinea" JSONB,
    "rutaEstimada" BOOLEAN NOT NULL DEFAULT false,
    "precio" JSONB NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "assignedAt" TIMESTAMP(3),
    "pickedUpAt" TIMESTAMP(3),
    "inTransitAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderStatusHistory" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "from" "OrderStatus",
    "to" "OrderStatus" NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorRol" TEXT NOT NULL,
    "motivo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FolioCounter" (
    "year" INTEGER NOT NULL,
    "last" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FolioCounter_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "correlationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedEvent" (
    "eventId" TEXT NOT NULL,
    "consumer" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedEvent_pkey" PRIMARY KEY ("eventId","consumer")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_folio_key" ON "Order"("folio");

-- CreateIndex
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Order_clienteId_createdAt_idx" ON "Order"("clienteId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Order_repartidorId_status_idx" ON "Order"("repartidorId", "status");

-- CreateIndex
CREATE INDEX "OrderStatusHistory_orderId_createdAt_idx" ON "OrderStatusHistory"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "OutboxEvent_publishedAt_createdAt_idx" ON "OutboxEvent"("publishedAt", "createdAt");

-- AddForeignKey
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

