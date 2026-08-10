-- Liq Academy Mini App schema
-- Run this once in Supabase → SQL Editor → New query → Run

create extension if not exists "pgcrypto";

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint courses_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  slug text not null,
  title text not null,
  content_md text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, slug),
  constraint chapters_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  slug text not null,
  title text not null,
  content_md text not null default '',
  year text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, slug),
  constraint exams_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null default '',
  content_md text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint departments_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create index if not exists chapters_course_id_idx on public.chapters(course_id);
create index if not exists exams_course_id_idx on public.exams(course_id);

alter table public.courses enable row level security;
alter table public.chapters enable row level security;
alter table public.exams enable row level security;
alter table public.departments enable row level security;

drop policy if exists "Public read courses" on public.courses;
create policy "Public read courses" on public.courses for select using (true);

drop policy if exists "Public read chapters" on public.chapters;
create policy "Public read chapters" on public.chapters for select using (true);

drop policy if exists "Public read exams" on public.exams;
create policy "Public read exams" on public.exams for select using (true);

drop policy if exists "Public read departments" on public.departments;
create policy "Public read departments" on public.departments for select using (true);

-- Writes go through the Next.js admin API using the service role key (bypasses RLS).
