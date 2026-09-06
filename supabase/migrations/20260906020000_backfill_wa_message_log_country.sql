-- Backfill: rows logged before the guessCountry fix (lib/whatsapp/log.ts)
-- mis-tagged every bare 10-digit Indian member number as 'OTHER', because
-- the old logic checked the raw DB value for a "91" prefix instead of
-- normalizing first. That made those rows fail to join wa_rate_card
-- (which only has 'IN' rows), so their cost was silently dropped from the
-- admin cost dashboard.
--
-- Re-derive country the same way the fixed code does: normalize to Meta's
-- "91XXXXXXXXXX" form, then check the prefix. Since the app is 100% Indian
-- traffic today, `OTHER` rows with a plausible 10-digit or 91-prefixed
-- number are corrected to 'IN'; anything else is left as-is.
update public.wa_message_log
set country = 'IN'
where country = 'OTHER'
  and (
    to_phone ~ '^[6-9][0-9]{9}$'                 -- bare 10-digit Indian mobile
    or regexp_replace(to_phone, '[\s\-()+]', '', 'g') ~ '^91[6-9][0-9]{9}$'
  );
