-- Pre-drizzle drift (#773): `buildings.type` (+ its enum) and the double
-- precision lat/lon columns were applied to the live databases by hand and never
-- captured by a migration, so replaying the chain into an empty schema (an E2E
-- run schema, a fork, a fresh local DB) produced a structure the app rejects.
-- Every statement is a no-op where the live shape already matches.
DO $$
BEGIN
  CREATE TYPE "building_type" AS ENUM ('admin', 'non-admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
ALTER TABLE "buildings"
  ADD COLUMN IF NOT EXISTS "type" "building_type" DEFAULT 'non-admin' NOT NULL;
--> statement-breakpoint
ALTER TABLE "buildings" ALTER COLUMN "lat" TYPE double precision;
--> statement-breakpoint
ALTER TABLE "buildings" ALTER COLUMN "lon" TYPE double precision;
--> statement-breakpoint
ALTER TABLE "dorms" ALTER COLUMN "lat" TYPE double precision;
--> statement-breakpoint
ALTER TABLE "dorms" ALTER COLUMN "lon" TYPE double precision;
