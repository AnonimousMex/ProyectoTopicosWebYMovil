-- CreateEnum
CREATE TYPE "EnvioStatus" AS ENUM ('EN_POOL', 'ASIGNADO', 'EN_RUTA', 'COMPLETADO', 'CANCELADO');

-- CreateTable
CREATE TABLE "Medio" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "icono" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "velocidadKmh" DOUBLE PRECISION NOT NULL,
    "sensibilidadTrafico" DOUBLE PRECISION NOT NULL,
    "costoBase" DOUBLE PRECISION NOT NULL,
    "costoPorKm" DOUBLE PRECISION NOT NULL,
    "costoPorKg" DOUBLE PRECISION NOT NULL,
    "costoOperativoKm" DOUBLE PRECISION NOT NULL,
    "pesoMaxKg" DOUBLE PRECISION NOT NULL,
    "volumenMaxL" DOUBLE PRECISION NOT NULL,
    "distanciaMaxKm" DOUBLE PRECISION NOT NULL,
    "capacidadPaquetes" INTEGER NOT NULL,
    "emisionesGCO2Km" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Medio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Extra" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "minimo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Extra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Repartidor" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "medioId" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "disponible" BOOLEAN NOT NULL DEFAULT false,
    "baseNombre" TEXT NOT NULL,
    "baseLat" DOUBLE PRECISION NOT NULL,
    "baseLng" DOUBLE PRECISION NOT NULL,
    "calificacion" DOUBLE PRECISION NOT NULL DEFAULT 4.8,
    "entregasCompletadas" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Repartidor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Envio" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "origenDireccion" TEXT NOT NULL,
    "origenLat" DOUBLE PRECISION NOT NULL,
    "origenLng" DOUBLE PRECISION NOT NULL,
    "destinoDireccion" TEXT NOT NULL,
    "destinoLat" DOUBLE PRECISION NOT NULL,
    "destinoLng" DOUBLE PRECISION NOT NULL,
    "pesoKg" DOUBLE PRECISION NOT NULL,
    "volumenL" DOUBLE PRECISION NOT NULL,
    "fragil" BOOLEAN NOT NULL DEFAULT false,
    "urgencia" TEXT NOT NULL,
    "fechaLimite" TIMESTAMP(3) NOT NULL,
    "medioPreferido" TEXT,
    "extras" TEXT[],
    "status" "EnvioStatus" NOT NULL DEFAULT 'EN_POOL',
    "repartidorId" TEXT,
    "medioId" TEXT,
    "secuencia" INTEGER,
    "etaMinutos" DOUBLE PRECISION,
    "costoOperativo" DOUBLE PRECISION,
    "runId" TEXT,
    "sugerenciaMedio" TEXT,
    "sugerenciaMotivo" TEXT,
    "sugerenciaProveedor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Envio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptimizationRun" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "parametros" JSONB NOT NULL,
    "resumen" JSONB,
    "costoTotal" DOUBLE PRECISION,
    "costoGreedy" DOUBLE PRECISION,
    "mejoraPct" DOUBLE PRECISION,
    "generaciones" INTEGER,
    "duracionMs" INTEGER,
    "envios" INTEGER NOT NULL DEFAULT 0,
    "vehiculos" INTEGER NOT NULL DEFAULT 0,
    "creadoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "OptimizationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiProviderConfig" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "formato" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "prioridad" INTEGER NOT NULL,
    "timeoutMs" INTEGER NOT NULL DEFAULT 1500,

    CONSTRAINT "AiProviderConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedioDesempeno" (
    "medioId" TEXT NOT NULL,
    "entregas" INTEGER NOT NULL DEFAULT 0,
    "aTiempo" INTEGER NOT NULL DEFAULT 0,
    "tardias" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MedioDesempeno_pkey" PRIMARY KEY ("medioId")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
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
CREATE UNIQUE INDEX "Envio_orderId_key" ON "Envio"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Envio_folio_key" ON "Envio"("folio");

-- CreateIndex
CREATE INDEX "Envio_status_idx" ON "Envio"("status");

-- CreateIndex
CREATE INDEX "Envio_repartidorId_status_idx" ON "Envio"("repartidorId", "status");

-- CreateIndex
CREATE INDEX "OptimizationRun_createdAt_idx" ON "OptimizationRun"("createdAt");

-- CreateIndex
CREATE INDEX "OutboxEvent_publishedAt_createdAt_idx" ON "OutboxEvent"("publishedAt", "createdAt");

-- AddForeignKey
ALTER TABLE "Repartidor" ADD CONSTRAINT "Repartidor_medioId_fkey" FOREIGN KEY ("medioId") REFERENCES "Medio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

