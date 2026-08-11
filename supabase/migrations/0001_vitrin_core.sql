create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create schema if not exists private;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null default '',
  role text not null default 'buyer' check (role in ('buyer','seller','admin')),
  verified boolean not null default false,
  suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles_public (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  role text not null default 'buyer' check (role in ('buyer','seller','admin')),
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.profile_private (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text,
  updated_at timestamptz not null default now()
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 4 and 100),
  cat text not null check (cat in ('game','social','sub','other')),
  price numeric(14,2) check (price is null or price >= 0),
  description text not null check (char_length(description) between 10 and 2000),
  whatsapp text not null check (whatsapp ~ '^07[0-9]{8}$'),
  image_url text,
  active boolean not null default true,
  hidden boolean not null default false,
  views integer not null default 0 check (views >= 0),
  avg_rating numeric(3,2) not null default 0 check (avg_rating >= 0 and avg_rating <= 5),
  rating_count integer not null default 0 check (rating_count >= 0),
  report_count integer not null default 0 check (report_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  stars integer not null check (stars between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id, user_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (listing_id, user_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists listings_created_at_idx on public.listings (created_at desc, id desc);
create index if not exists listings_seller_idx on public.listings (seller_id, created_at desc, id desc);
create index if not exists listings_cat_idx on public.listings (cat, created_at desc, id desc);
create index if not exists listings_title_trgm_idx on public.listings using gin (title gin_trgm_ops);
create index if not exists listings_description_trgm_idx on public.listings using gin (description gin_trgm_ops);
create index if not exists comments_listing_idx on public.comments (listing_id, created_at asc);
create index if not exists ratings_listing_idx on public.ratings (listing_id);
create index if not exists reports_listing_idx on public.reports (listing_id);

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.suspended = false);
$$;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text := coalesce(new.raw_user_meta_data->>'role', 'buyer');
  safe_role text := case when requested_role = 'seller' then 'seller' else 'buyer' end;
  display_name text := left(coalesce(new.raw_user_meta_data->>'name', ''), 80);
  phone text := nullif(left(coalesce(new.raw_user_meta_data->>'phone', ''), 20), '');
begin
  insert into public.profiles (id, email, name, role)
  values (new.id, lower(new.email), display_name, safe_role)
  on conflict (id) do update set email = excluded.email, name = excluded.name;

  insert into public.profiles_public (id, name, role, verified, created_at)
  values (new.id, display_name, safe_role, false, coalesce(new.created_at, now()))
  on conflict (id) do nothing;

  if safe_role = 'seller' then
    insert into public.profile_private (id, phone) values (new.id, phone)
    on conflict (id) do update set phone = excluded.phone, updated_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

create or replace function private.sync_public_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles_public (id, name, role, verified, created_at)
  values (new.id, new.name, new.role, new.verified, new.created_at)
  on conflict (id) do update set name = excluded.name, role = excluded.role, verified = excluded.verified;
  return new;
end;
$$;

drop trigger if exists profiles_public_sync on public.profiles;
create trigger profiles_public_sync
after insert or update of name, role, verified on public.profiles
for each row execute function private.sync_public_profile();

create or replace function private.prevent_listing_privilege_changes()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null and not private.is_admin() and old.seller_id = auth.uid() then
    new.seller_id := old.seller_id;
    new.hidden := old.hidden;
    new.views := old.views;
    new.avg_rating := old.avg_rating;
    new.rating_count := old.rating_count;
    new.report_count := old.report_count;
  end if;
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists listings_guard on public.listings;
create trigger listings_guard
before update on public.listings
for each row execute function private.prevent_listing_privilege_changes();

create or replace function private.refresh_rating_stats(p_listing_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.listings l
  set avg_rating = coalesce((select round(avg(r.stars)::numeric, 2) from public.ratings r where r.listing_id = p_listing_id), 0),
      rating_count = (select count(*) from public.ratings r where r.listing_id = p_listing_id),
      updated_at = now()
  where l.id = p_listing_id;
$$;

create or replace function private.ratings_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.refresh_rating_stats(coalesce(new.listing_id, old.listing_id));
  if tg_op = 'UPDATE' and old.listing_id <> new.listing_id then
    perform private.refresh_rating_stats(old.listing_id);
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists ratings_stats on public.ratings;
create trigger ratings_stats
after insert or update or delete on public.ratings
for each row execute function private.ratings_changed();

create or replace function private.refresh_report_stats(p_listing_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.listings l
  set report_count = (select count(*) from public.reports r where r.listing_id = p_listing_id), updated_at = now()
  where l.id = p_listing_id;
$$;

create or replace function private.reports_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.refresh_report_stats(coalesce(new.listing_id, old.listing_id));
  if tg_op = 'UPDATE' and old.listing_id <> new.listing_id then
    perform private.refresh_report_stats(old.listing_id);
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists reports_stats on public.reports;
create trigger reports_stats
after insert or update or delete on public.reports
for each row execute function private.reports_changed();

create or replace view public.listings_view
with (security_invoker = true)
as
select
  l.id, l.seller_id, l.title, l.cat, l.price, l.description, l.whatsapp, l.image_url,
  l.active, l.hidden, l.views, l.avg_rating, l.rating_count, l.report_count,
  l.created_at, l.updated_at,
  pp.name as seller_name,
  pp.verified as seller_verified
from public.listings l
join public.profiles_public pp on pp.id = l.seller_id;

create or replace function public.increment_listing_views(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.listings
  set views = views + 1, updated_at = now()
  where id = p_listing_id and active = true and hidden = false;
end;
$$;

create or replace function private.log_admin_action(p_action text, p_target_type text, p_target_id uuid, p_details jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.is_admin() then raise exception 'forbidden'; end if;
  insert into public.audit_logs(actor_id, action, target_type, target_id, details)
  values (auth.uid(), p_action, p_target_type, p_target_id, coalesce(p_details, '{}'::jsonb));
end;
$$;

create or replace function public.admin_set_user_flags(p_user_id uuid, p_verified boolean default null, p_suspended boolean default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.is_admin() then raise exception 'forbidden'; end if;
  update public.profiles
  set verified = coalesce(p_verified, verified), suspended = coalesce(p_suspended, suspended), updated_at = now()
  where id = p_user_id and role <> 'admin';
  perform private.log_admin_action('set_user_flags', 'profile', p_user_id, jsonb_build_object('verified', p_verified, 'suspended', p_suspended));
end;
$$;

create or replace function public.admin_set_listing_hidden(p_listing_id uuid, p_hidden boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.is_admin() then raise exception 'forbidden'; end if;
  update public.listings set hidden = p_hidden, updated_at = now() where id = p_listing_id;
  perform private.log_admin_action('set_listing_hidden', 'listing', p_listing_id, jsonb_build_object('hidden', p_hidden));
end;
$$;

create or replace function public.admin_clear_reports(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.is_admin() then raise exception 'forbidden'; end if;
  delete from public.reports where listing_id = p_listing_id;
  perform private.log_admin_action('clear_reports', 'listing', p_listing_id);
end;
$$;

alter table public.profiles enable row level security;
alter table public.profiles_public enable row level security;
alter table public.profile_private enable row level security;
alter table public.listings enable row level security;
alter table public.ratings enable row level security;
alter table public.reports enable row level security;
alter table public.comments enable row level security;
alter table public.favorites enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin on public.profiles for select to authenticated using (id = auth.uid() or private.is_admin());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated using (id = auth.uid() and not private.is_admin()) with check (id = auth.uid() and not private.is_admin());

drop policy if exists profiles_public_select on public.profiles_public;
create policy profiles_public_select on public.profiles_public for select to anon, authenticated using (true);

drop policy if exists profile_private_self on public.profile_private;
create policy profile_private_self on public.profile_private for select to authenticated using (id = auth.uid());
drop policy if exists profile_private_update on public.profile_private;
create policy profile_private_update on public.profile_private for insert to authenticated with check (id = auth.uid());
create policy profile_private_upd on public.profile_private for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists listings_public_or_owner_select on public.listings;
create policy listings_public_or_owner_select on public.listings for select to anon, authenticated using ((active = true and hidden = false) or seller_id = auth.uid() or private.is_admin());
drop policy if exists listings_insert_seller on public.listings;
create policy listings_insert_seller on public.listings for insert to authenticated with check (seller_id = auth.uid() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'seller' and p.suspended = false));
drop policy if exists listings_update_owner_admin on public.listings;
create policy listings_update_owner_admin on public.listings for update to authenticated using (seller_id = auth.uid() or private.is_admin()) with check (seller_id = auth.uid() or private.is_admin());
drop policy if exists listings_delete_owner_admin on public.listings;
create policy listings_delete_owner_admin on public.listings for delete to authenticated using (seller_id = auth.uid() or private.is_admin());

create policy ratings_select on public.ratings for select to anon, authenticated using (true);
create policy ratings_insert on public.ratings for insert to authenticated with check (user_id = auth.uid());
create policy ratings_update on public.ratings for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy ratings_delete on public.ratings for delete to authenticated using (user_id = auth.uid() or private.is_admin());

create policy reports_insert on public.reports for insert to authenticated with check (user_id = auth.uid());
create policy reports_delete_admin on public.reports for delete to authenticated using (private.is_admin());

create policy comments_select on public.comments for select to anon, authenticated using (true);
create policy comments_insert on public.comments for insert to authenticated with check (user_id = auth.uid());
create policy comments_delete on public.comments for delete to authenticated using (user_id = auth.uid() or private.is_admin());

create policy favorites_select on public.favorites for select to authenticated using (user_id = auth.uid());
create policy favorites_insert on public.favorites for insert to authenticated with check (user_id = auth.uid());
create policy favorites_delete on public.favorites for delete to authenticated using (user_id = auth.uid());

create policy audit_logs_admin on public.audit_logs for select to authenticated using (private.is_admin());

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
revoke update, insert, delete on public.profiles from authenticated;

grant select on public.profiles_public to anon, authenticated;
grant select, insert, update on public.profile_private to authenticated;
grant select, insert, update, delete on public.listings to authenticated;
grant select on public.listings to anon;
grant select, insert, update, delete on public.ratings to authenticated;
grant select on public.ratings to anon, authenticated;
grant insert on public.reports to authenticated;
grant delete on public.reports to authenticated;
grant select, insert, delete on public.comments to authenticated;
grant select on public.comments to anon, authenticated;
grant select, insert, delete on public.favorites to authenticated;
grant select on public.audit_logs to authenticated;
grant select on public.listings_view to anon, authenticated;
revoke all on public.listings_view from public;
grant select on public.listings_view to anon, authenticated;

grant execute on function public.increment_listing_views(uuid) to anon, authenticated;
grant execute on function public.admin_set_user_flags(uuid, boolean, boolean) to authenticated;
grant execute on function public.admin_set_listing_hidden(uuid, boolean) to authenticated;
grant execute on function public.admin_clear_reports(uuid) to authenticated;
grant execute on function private.is_admin() to authenticated;

create trigger profiles_touch before update on public.profiles for each row execute function private.touch_updated_at();
create trigger profile_private_touch before update on public.profile_private for each row execute function private.touch_updated_at();
create trigger ratings_touch before update on public.ratings for each row execute function private.touch_updated_at();
create trigger comments_touch before update on public.comments for each row execute function private.touch_updated_at();

-- Ensure existing auth users are represented (safe for an empty/new project).
insert into public.profiles (id, email, name)
select id, lower(email), left(coalesce(raw_user_meta_data->>'name',''),80)
from auth.users
on conflict (id) do nothing;

insert into public.profiles_public (id, name, role, verified, created_at)
select p.id, p.name, p.role, p.verified, p.created_at from public.profiles p
on conflict (id) do update set name=excluded.name, role=excluded.role, verified=excluded.verified;

create or replace function public.update_my_profile(p_name text, p_phone text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if char_length(trim(coalesce(p_name,''))) < 2 or char_length(trim(p_name)) > 80 then raise exception 'invalid_name'; end if;
  if p_phone is not null and p_phone <> '' and p_phone !~ '^07[0-9]{8}$' then raise exception 'invalid_phone'; end if;

  update public.profiles set name = trim(p_name), updated_at = now() where id = auth.uid();
  insert into public.profile_private (id, phone) values (auth.uid(), nullif(p_phone,''))
  on conflict (id) do update set phone = excluded.phone, updated_at = now();
end;
$$;
revoke all on function public.update_my_profile(text, text) from public, anon;
grant execute on function public.update_my_profile(text, text) to authenticated;

create or replace function private.auto_hide_reported_listing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.listings
  set hidden = true, updated_at = now()
  where id = new.listing_id
    and (select count(*) from public.reports r where r.listing_id = new.listing_id) >= 3;
  return new;
end;
$$;
drop trigger if exists reports_auto_hide on public.reports;
create trigger reports_auto_hide
after insert on public.reports
for each row execute function private.auto_hide_reported_listing();

insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do update set public = true;

drop policy if exists listing_images_public_read on storage.objects;
create policy listing_images_public_read on storage.objects for select to anon, authenticated using (bucket_id = 'listing-images');
drop policy if exists listing_images_insert_own on storage.objects;
create policy listing_images_insert_own on storage.objects for insert to authenticated with check (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists listing_images_update_own on storage.objects;
create policy listing_images_update_own on storage.objects for update to authenticated using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists listing_images_delete_own on storage.objects;
create policy listing_images_delete_own on storage.objects for delete to authenticated using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);
