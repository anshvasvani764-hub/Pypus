-- Expense module schema for Supabase
-- Run this in your Supabase SQL Editor if these tables don't exist yet.

-- 1. Expense categories
create table if not exists public.expense_categories (
  id text primary key default gen_random_uuid()::text,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  name text not null,
  color text null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists expense_categories_workspace_id_idx
  on public.expense_categories (workspace_id);

-- 2. Expense templates
create table if not exists public.expense_templates (
  id text primary key default gen_random_uuid()::text,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  category_id text null references public.expense_categories(id) on delete set null,
  name text not null,
  amount numeric not null,
  frequency text not null default 'one-time',
  due_day integer null,
  status text not null default 'active',
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists expense_templates_workspace_id_idx
  on public.expense_templates (workspace_id);

-- 3. Expenses
create table if not exists public.expenses (
  id text primary key default gen_random_uuid()::text,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  category_id text null references public.expense_categories(id) on delete set null,
  template_id text null,
  name text not null,
  amount numeric not null,
  status text not null default 'pending',
  due_date date null,
  paid_date date null,
  payment_method text null,
  notes text null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists expenses_workspace_id_idx
  on public.expenses (workspace_id);

create index if not exists expenses_due_date_idx
  on public.expenses (due_date);

-- Enable Row Level Security
alter table public.expense_categories enable row level security;
alter table public.expense_templates enable row level security;
alter table public.expenses enable row level security;

-- RLS Policies for expense_categories
create policy "Users can view categories in their workspace"
  on public.expense_categories for select
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and is_active = true
    )
  );

create policy "Users can create categories in their workspace"
  on public.expense_categories for insert
  with check (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and is_active = true
    )
  );

create policy "Users can update categories in their workspace"
  on public.expense_categories for update
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and is_active = true
    )
  );

create policy "Users can delete categories in their workspace"
  on public.expense_categories for delete
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and is_active = true
    )
  );

-- RLS Policies for expense_templates
create policy "Users can view templates in their workspace"
  on public.expense_templates for select
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and is_active = true
    )
  );

create policy "Users can manage templates in their workspace"
  on public.expense_templates for all
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and is_active = true
    )
  );

-- RLS Policies for expenses
create policy "Users can view expenses in their workspace"
  on public.expenses for select
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and is_active = true
    )
  );

create policy "Users can manage expenses in their workspace"
  on public.expenses for all
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and is_active = true
    )
  );
