-- Speed up duplicate-phone lookups during member CSV/XLSX import
create index if not exists idx_members_workspace_phone on members(workspace_id, phone);

-- Audit/history table for each bulk-import run
create table if not exists import_batches (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id),
  uploaded_by uuid references users(id),
  file_name text,
  total_rows int not null default 0,
  imported_count int not null default 0,
  skipped_count int not null default 0,
  plans_created int not null default 0,
  status text not null default 'completed' check (status in ('completed','partial','failed')),
  error_summary jsonb,
  created_at timestamptz default now()
);

alter table import_batches enable row level security;

create policy import_batches_select_workspace on import_batches
  for select
  to authenticated
  using (is_workspace_member(workspace_id) or is_workspace_owner(workspace_id));

create policy import_batches_write_workspace on import_batches
  for all
  to authenticated
  using (is_workspace_member(workspace_id) or is_workspace_owner(workspace_id))
  with check (is_workspace_member(workspace_id) or is_workspace_owner(workspace_id));
