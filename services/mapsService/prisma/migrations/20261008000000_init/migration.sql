-- CreateTable
CREATE TABLE "Zona" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "centroLat" DOUBLE PRECISION NOT NULL,
    "centroLng" DOUBLE PRECISION NOT NULL,
    "radioKm" DOUBLE PRECISION NOT NULL,
    "tortuosidad" DOUBLE PRECISION NOT NULL DEFAULT 1.3,
    "perfilTrafico" DOUBLE PRECISION[],

    CONSTRAINT "Zona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lugar" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "colonia" TEXT NOT NULL,
    "cp" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "zonaId" TEXT NOT NULL,

    CONSTRAINT "Lugar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaosConfig" (
    "id" TEXT NOT NULL,
    "caido" BOOLEAN NOT NULL DEFAULT false,
    "tasaFallo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "latenciaMs" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChaosConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lugar_nombre_idx" ON "Lugar"("nombre");

-- AddForeignKey
ALTER TABLE "Lugar" ADD CONSTRAINT "Lugar_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "Zona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

