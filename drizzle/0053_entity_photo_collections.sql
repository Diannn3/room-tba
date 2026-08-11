ALTER TABLE "buildings"
  ADD COLUMN IF NOT EXISTS "photos" jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE "rooms"
  ADD COLUMN IF NOT EXISTS "photos" jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE "dorms"
  ADD COLUMN IF NOT EXISTS "photos" jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE "buildings"
SET "photos" = jsonb_build_array(
  jsonb_build_object(
    'url', "image_url",
    'attributionName', NULL,
    'attributionProfileUrl', NULL
  )
)
WHERE "image_url" IS NOT NULL AND "photos" = '[]'::jsonb;

UPDATE "rooms"
SET "photos" = jsonb_build_array(
  jsonb_build_object(
    'url', "image_url",
    'attributionName', NULL,
    'attributionProfileUrl', NULL
  )
)
WHERE "image_url" IS NOT NULL AND "photos" = '[]'::jsonb;

UPDATE "dorms"
SET "photos" = jsonb_build_array(
  jsonb_build_object(
    'url', "image_url",
    'attributionName', NULL,
    'attributionProfileUrl', NULL
  )
)
WHERE "image_url" IS NOT NULL AND "photos" = '[]'::jsonb;
