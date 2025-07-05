-- CreateTable
CREATE TABLE "note_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "note_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "note_types_name_key" ON "note_types"("name");

-- Insert default note types from current hardcoded list
INSERT INTO "note_types" ("id", "name", "isActive", "createdAt", "updatedAt") VALUES
('clx1a1b2c3d4e5f6g7h8i9j0', 'Client (PAS DE REPONSE 1)', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('clx2a1b2c3d4e5f6g7h8i9j0', 'Client (PAS DE REPONSE 2)', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('clx3a1b2c3d4e5f6g7h8i9j0', 'Client (PAS DE REPONSE 3)', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('clx4a1b2c3d4e5f6g7h8i9j0', 'Client (PAS DE REPONSE 4+SMS)', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('clx5a1b2c3d4e5f6g7h8i9j0', 'CLIENT (REPORTER)', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('clx6a1b2c3d4e5f6g7h8i9j0', 'CLIENT (ANNULE)', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('clx7a1b2c3d4e5f6g7h8i9j0', 'Relancé', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('clx8a1b2c3d4e5f6g7h8i9j0', 'Remboursement', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('clx9a1b2c3d4e5f6g7h8i9j0', 'Echange', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('clx0a1b2c3d4e5f6g7h8i9j1', 'Reporté à une date', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('clx1a1b2c3d4e5f6g7h8i9j1', 'Approuvé à une date', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('clx2a1b2c3d4e5f6g7h8i9j1', 'Problem (client / livreur)', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('clx3a1b2c3d4e5f6g7h8i9j1', 'Problem (commande)', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('clx4a1b2c3d4e5f6g7h8i9j1', 'Livrée (en attente de finalisation)', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('clx5a1b2c3d4e5f6g7h8i9j1', 'Autre (personnalisé)', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);