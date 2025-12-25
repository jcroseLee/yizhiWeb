-- Create divination_notes table to support multiple notes per record
create table if not exists public.divination_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  divination_record_id uuid not null references public.divination_records(id) on delete cascade,
  content text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.divination_notes enable row level security;

-- Create policies
create policy "Users can view their own notes"
  on public.divination_notes for select
  using (auth.uid() = user_id);

create policy "Users can insert their own notes"
  on public.divination_notes for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own notes"
  on public.divination_notes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own notes"
  on public.divination_notes for delete
  using (auth.uid() = user_id);

-- Create index for faster lookups
create index if not exists idx_divination_notes_record_id 
  on public.divination_notes(divination_record_id);

create index if not exists idx_divination_notes_user_id 
  on public.divination_notes(user_id);

-- Trigger to update updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at
  before update on public.divination_notes
  for each row
  execute function public.handle_updated_at();

-- Migrate existing notes from divination_records to divination_notes
-- This is a one-time operation to move data from the old column to the new table
do $$
begin
  if exists (
    select 1 from information_schema.columns 
    where table_name = 'divination_records' and column_name = 'note'
  ) then
    insert into public.divination_notes (user_id, divination_record_id, content, created_at, updated_at)
    select user_id, id, note, created_at, created_at
    from public.divination_records
    where note is not null and note != '';
  end if;
end $$;
