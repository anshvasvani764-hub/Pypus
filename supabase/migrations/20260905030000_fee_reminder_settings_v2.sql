-- Upgrades the Fee Reminders automation from its v1 shape (days_after_due +
-- once/daily/every_2_days enum, one combined "sent" log) to the real design:
--   - a separate before-due "soft reminder" (fires once, days before due date)
--   - an after-due "overdue reminder" chain (first fire N hours after due
--     date, then repeats every M hours until the fee is paid)
--   - hour-precision so "24" reads as "1 day" in the UI instead of forcing
--     day-only granularity
-- Not live yet (FEE_REMINDERS_LIVE = false in the page), so this is a clean
-- column swap rather than a migrate-old-data affair.

alter table public.fee_reminder_settings
  add column if not exists before_due_days int not null default 1,
  add column if not exists after_due_hours int not null default 24,
  add column if not exists repeat_interval_hours int not null default 48;

alter table public.fee_reminder_settings
  add constraint fee_reminder_settings_repeat_interval_hours_check
    check (repeat_interval_hours >= 24);

alter table public.fee_reminder_settings
  drop column if exists days_after_due,
  drop column if exists repeat_interval;

-- Which side of the due date a sent "fees" reminder belongs to, so the page
-- can show two separate logs instead of one combined feed. Null for
-- attendance reminders (reason != 'fees'), where the split doesn't apply.
alter table public.reminders
  add column if not exists reminder_stage text
    check (reminder_stage in ('before_due', 'overdue'));
