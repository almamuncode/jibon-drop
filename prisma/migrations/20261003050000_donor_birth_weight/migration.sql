ALTER TABLE "Donor" ADD COLUMN "dateOfBirth" DATE, ADD COLUMN "weightKg" DOUBLE PRECISION;
ALTER TABLE "Donor" ADD CONSTRAINT "Donor_weightKg_check" CHECK ("weightKg" > 0 AND "weightKg" <= 500);
