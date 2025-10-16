/*
  Warnings:

  - You are about to drop the column `company` on the `leads` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `leads` table. All the data in the column will be lost.
  - You are about to drop the column `followUpDate` on the `leads` table. All the data in the column will be lost.
  - You are about to drop the column `lastContactedAt` on the `leads` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `leads` table. All the data in the column will be lost.
  - Added the required column `city` to the `leads` table without a default value. This is not possible if the table is not empty.
  - Added the required column `email1` to the `leads` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone1` to the `leads` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "leads" DROP COLUMN "company",
DROP COLUMN "email",
DROP COLUMN "followUpDate",
DROP COLUMN "lastContactedAt",
DROP COLUMN "phone",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT NOT NULL,
ADD COLUMN     "email1" TEXT NOT NULL,
ADD COLUMN     "email2" TEXT,
ADD COLUMN     "invoice" TEXT,
ADD COLUMN     "nit" TEXT,
ADD COLUMN     "phone1" TEXT NOT NULL,
ADD COLUMN     "phone2" TEXT;
