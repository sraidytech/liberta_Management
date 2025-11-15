-- Add new critical ticket categories
-- Migration: Add EXCHANGE, REFUND, and QUALITY_CONTROL categories to TicketCategory enum

-- AlterEnum
ALTER TYPE "TicketCategory" ADD VALUE 'EXCHANGE';
ALTER TYPE "TicketCategory" ADD VALUE 'REFUND';
ALTER TYPE "TicketCategory" ADD VALUE 'QUALITY_CONTROL';