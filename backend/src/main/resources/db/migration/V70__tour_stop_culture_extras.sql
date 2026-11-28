ALTER TABLE tour_stops
    ADD COLUMN IF NOT EXISTS fun_fact TEXT,
    ADD COLUMN IF NOT EXISTS cultural_timeline TEXT,
    ADD COLUMN IF NOT EXISTS cultural_glossary TEXT;
