-- Keyset pagination for GET /api/classes (#412): supports
-- WHERE term_id = ? ORDER BY COALESCE(course_code,''), COALESCE(section,''), id
CREATE INDEX IF NOT EXISTS "classes_term_course_section_id_idx"
  ON "classes" ("term_id", (COALESCE("course_code", '')), (COALESCE("section", '')), "id");
