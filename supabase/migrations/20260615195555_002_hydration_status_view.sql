-- Enable pg_cron extension for scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a view to easily see current status
CREATE OR REPLACE VIEW hydration_status AS
SELECT 
    h.day_of_week,
    CASE h.day_of_week
        WHEN 0 THEN 'Domingo'
        WHEN 1 THEN 'Segunda'
        WHEN 2 THEN 'Terça'
        WHEN 3 THEN 'Quarta'
        WHEN 4 THEN 'Quinta'
        WHEN 5 THEN 'Sexta'
        WHEN 6 THEN 'Sábado'
    END as dia_semana,
    h.daily_goal_ml,
    h.dose_ml,
    h.times,
    h.enabled,
    EXTRACT(DOW FROM (NOW() AT TIME ZONE 'America/Sao_Paulo')) as hoje_dow,
    TO_CHAR(NOW() AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI') as hora_brasilia
FROM hydration_config h
ORDER BY h.day_of_week;