-- Replaces the Vercel cron trigger for /api/cron/fee-reminders with a
-- Supabase pg_cron job. Vercel's Hobby (free) plan only allows crons that
-- fire once per day, so the hourly schedule this route needs (see
-- vercel.json's old "0 * * * *" entry) can't run there without upgrading
-- to Pro. pg_cron runs inside Postgres itself, is free on every Supabase
-- plan, and can call the same route over HTTP via pg_net -- the route's
-- own code (auth check, eligibility, WhatsApp send) is untouched.

-- 1) Extensions needed: pg_cron to schedule, pg_net to make the HTTP call.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- 2) Store CRON_SECRET in Supabase Vault instead of hardcoding it here.
--    Run this once from the SQL editor (NOT committed with the real
--    value) after this migration applies:
--
--      select vault.create_secret('<same value as Vercel CRON_SECRET env var>', 'fee_reminder_cron_secret');
--
--    If you ever rotate the secret, use vault.update_secret instead.

-- 3) The scheduled job: every hour, on the hour, POST to the fee-reminders
--    route with the same Bearer auth the route already checks for.
select
  cron.schedule(
    'fee-reminders-hourly',
    '0 * * * *',
    $$
    select net.http_get(
      url := 'https://pypus.in/api/cron/fee-reminders',
      headers := jsonb_build_object(
        'Authorization',
        'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'fee_reminder_cron_secret')
      ),
      timeout_milliseconds := 25000
    );
    $$
  );

-- To check it's registered:      select * from cron.job;
-- To see run history/failures:   select * from cron.job_run_details order by start_time desc limit 20;
-- To unschedule if needed:       select cron.unschedule('fee-reminders-hourly');
