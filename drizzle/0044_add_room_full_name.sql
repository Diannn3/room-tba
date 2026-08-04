-- #875: rooms carry an abbreviated, opaque code ("MLH", "PHYSIO LR", "DSDS MLH").
-- The readable expansion used to be a second row that the 2026-08-04 duplicate
-- merge folded away into an alias. full_name keeps that spelling as data:
-- room_code stays the short identifier students type and AMIS emits, full_name
-- carries the unabbreviated name. Nullable: most rooms never get one.
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "full_name" text;
