-- Make userId required on all 10 data models (contract step of expand-contract)
-- All existing rows already have userId backfilled from seed

-- Drop old unique constraints/indexes that don't include userId
-- Prisma names these as INDEXes (not CONSTRAINTs) when declared via @@unique without explicit constraint name,
-- so we must DROP INDEX, not DROP CONSTRAINT (the latter silently no-ops with IF EXISTS).
ALTER TABLE "Budget" DROP CONSTRAINT IF EXISTS "Budget_periodId_categoryId_key";
DROP INDEX IF EXISTS "Budget_periodId_categoryId_key";
ALTER TABLE "Period" DROP CONSTRAINT IF EXISTS "Period_month_year_key";
DROP INDEX IF EXISTS "Period_month_year_key";

-- Make userId NOT NULL on all 10 models
ALTER TABLE "IncomeSource" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Transaction" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Category" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Debt" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Budget" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Period" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "MonthlySummary" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "ValueUnit" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "UnitRate" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Asset" ALTER COLUMN "userId" SET NOT NULL;

-- Create new unique constraints that include userId
CREATE UNIQUE INDEX "Budget_periodId_categoryId_userId_key" ON "Budget"("periodId", "categoryId", "userId");
CREATE UNIQUE INDEX "Period_month_year_userId_key" ON "Period"("month", "year", "userId");
