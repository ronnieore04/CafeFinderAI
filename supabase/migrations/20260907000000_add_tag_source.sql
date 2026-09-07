-- Tracks where each cafe_tags row's data came from, so downstream
-- consumers (matching logic, UI) can treat AI-inferred values with
-- appropriate skepticism rather than trusting all rows equally.
--
-- 'ai'             — inferred by scripts/tag-cafes.ts from Google reviews
-- 'human'           — hand-tagged (e.g. via the spreadsheet -> SQL workflow)
-- 'places_reviews'  — reserved for a future non-LLM heuristic pass, if any
alter table cafe_tags
  add column tag_source text check (tag_source in ('ai', 'human', 'places_reviews'));