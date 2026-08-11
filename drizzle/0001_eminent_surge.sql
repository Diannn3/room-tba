ALTER TABLE "sponsor_impressions" RENAME COLUMN "event_type" TO "eventType";--> statement-breakpoint
ALTER TABLE "flora_specimens" DROP CONSTRAINT "flora_specimens_species_id_fkey";
--> statement-breakpoint
DROP INDEX "idx_presence_last_seen";--> statement-breakpoint
DROP INDEX "idx_sponsor_imp_sponsor_date";--> statement-breakpoint
DROP INDEX "idx_sponsor_imp_zone_date";--> statement-breakpoint
DROP INDEX "jeepney_stops_route_sort_order";--> statement-breakpoint
DROP INDEX "classes_term_course_section_id_idx";--> statement-breakpoint
DROP INDEX "events_slug_unique";--> statement-breakpoint
DROP INDEX "update_table_name_key";--> statement-breakpoint
DROP INDEX "admin_users_username_unique";--> statement-breakpoint
DROP INDEX "buildings_street_view_pano_idx";--> statement-breakpoint
DROP INDEX "aliases_normalized_target";--> statement-breakpoint
DROP INDEX "flora_specimens_notable_idx";--> statement-breakpoint
DROP INDEX "flora_specimens_species_idx";--> statement-breakpoint
DROP INDEX "terms_single_default";--> statement-breakpoint
DROP INDEX "feedback_created_at_idx";--> statement-breakpoint
ALTER TABLE "dorms" ADD COLUMN "photos" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "photos" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "buildings" ADD COLUMN "photos" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "flora_specimens" ADD CONSTRAINT "flora_specimens_species_id_flora_species_id_fk" FOREIGN KEY ("species_id") REFERENCES "public"."flora_species"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_sponsor_imp_sponsor_date" ON "sponsor_impressions" USING btree ("sponsor_id","recorded_at");--> statement-breakpoint
CREATE INDEX "idx_sponsor_imp_zone_date" ON "sponsor_impressions" USING btree ("zone","recorded_at");--> statement-breakpoint
CREATE UNIQUE INDEX "jeepney_stops_route_sort_order" ON "jeepney_stops" USING btree ("route_id","sort_order");--> statement-breakpoint
CREATE INDEX "classes_term_course_section_id_idx" ON "classes" USING btree ("term_id",(COALESCE("course_code", '')),(COALESCE("section", '')),"id");--> statement-breakpoint
CREATE UNIQUE INDEX "events_slug_unique" ON "events" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "update_table_name_key" ON "update" USING btree ("table_name");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_users_username_unique" ON "admin_users" USING btree ("username");--> statement-breakpoint
CREATE INDEX "buildings_street_view_pano_idx" ON "buildings" USING btree ("id") WHERE "buildings"."street_view_pano_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "aliases_normalized_target" ON "aliases" USING btree ("normalized_alias","target_type","target_id");--> statement-breakpoint
CREATE INDEX "flora_specimens_notable_idx" ON "flora_specimens" USING btree ("is_notable");--> statement-breakpoint
CREATE INDEX "flora_specimens_species_idx" ON "flora_specimens" USING btree ("species_id");--> statement-breakpoint
CREATE UNIQUE INDEX "terms_single_default" ON "terms" USING btree ("is_default") WHERE "terms"."is_default";--> statement-breakpoint
CREATE INDEX "feedback_created_at_idx" ON "feedback" USING btree ("created_at" DESC NULLS LAST);
