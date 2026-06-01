-- Ensure review_sections rows exist.
-- The initial schema migration included this INSERT but it may not have
-- executed in all environments. This migration is idempotent.

INSERT INTO public.review_sections (key, title, description, sort_order)
VALUES
  ('course_metadata',  'Course Metadata',   'Basic course identity, term, department, and migration metadata.',                    10),
  ('review_matrix',    'Review Matrix',     'Structured checklist for migrated course review items.',                              20),
  ('syllabus_review',  'Syllabus Review',   'Syllabus presence, accuracy, links, dates, and Brightspace readiness.',              30),
  ('gradebook_review', 'Gradebook Review',  'Gradebook categories, items, weights, visibility, and calculation checks.',          40),
  ('general_notes',    'General Notes',     'Additional reviewer notes not captured in the structured sections.',                  50)
ON CONFLICT (key) DO UPDATE
  SET title       = excluded.title,
      description = excluded.description,
      sort_order  = excluded.sort_order,
      is_active   = true;
