/*
  Warnings:

  - You are about to drop the column `invoice` on the `leads` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "leads" DROP COLUMN "invoice",
ADD COLUMN     "company" TEXT,
ADD COLUMN     "razonSocial" TEXT;
