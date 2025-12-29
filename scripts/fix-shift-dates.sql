-- =============================================================================
-- TIMEZONE FIX: Corrigeer shift datums die verkeerd zijn opgeslagen
-- =============================================================================
-- 
-- PROBLEEM: 
-- Shifts werden opgeslagen met middernacht lokale tijd (00:00 CET), maar PostgreSQL
-- converteert dit naar UTC, waardoor 00:00 CET → 23:00 UTC de VORIGE dag wordt.
-- Voorbeeld: 7 februari 00:00 CET → 6 februari 23:00 UTC → "2026-02-06 23:00:00"
--
-- OPLOSSING:
-- 1. Voeg 1 dag toe aan alle shifts met 23:00 timestamp
-- 2. Zet de tijd naar 11:00 (consistent met de nieuwe code die 12:00 lokaal gebruikt)
--
-- UITVOEREN OP WINDOWS SERVER:
-- 1. Open pgAdmin of command prompt
-- 2. Verbind met de database
-- 3. Voer dit script uit
-- =============================================================================

-- STAP 1: Bekijk eerst hoeveel shifts worden geraakt (DRY RUN)
SELECT 
    id,
    "userId",
    date,
    date + INTERVAL '1 day' AS new_date,
    type,
    month,
    year
FROM shifts 
WHERE EXTRACT(HOUR FROM date) = 23
ORDER BY date;

-- STAP 2: Controleer het aantal
SELECT COUNT(*) AS affected_shifts 
FROM shifts 
WHERE EXTRACT(HOUR FROM date) = 23;

-- =============================================================================
-- UNCOMMENT DE ONDERSTAANDE QUERIES OM DE FIX UIT TE VOEREN
-- =============================================================================

-- STAP 3: Fix de datums (+1 dag en zet tijd naar 11:00 voor consistentie)
/*
UPDATE shifts 
SET date = date_trunc('day', date + INTERVAL '1 day') + INTERVAL '11 hours'
WHERE EXTRACT(HOUR FROM date) = 23;
*/

-- STAP 4: Verifieer de fix
/*
SELECT 
    id,
    "userId",
    date,
    type,
    month,
    year
FROM shifts 
WHERE EXTRACT(HOUR FROM date) = 11
ORDER BY date DESC
LIMIT 20;
*/

-- =============================================================================
-- ALTERNATIEVE AANPAK: Fix alleen shifts van een specifieke maand/jaar
-- =============================================================================

-- Alleen februari 2026 fixen:
/*
UPDATE shifts 
SET date = date_trunc('day', date + INTERVAL '1 day') + INTERVAL '11 hours'
WHERE EXTRACT(HOUR FROM date) = 23
  AND month = 2 
  AND year = 2026;
*/
