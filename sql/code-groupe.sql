-- Code du groupe Freestyle Tricks : sans lui, la base refuse toute lecture et écriture
-- des tables ft_* depuis l'extérieur. Le code n'est stocké que sous forme d'empreinte (SHA-256).
-- À exécuter une fois dans Supabase (projet kdrama-app) : SQL Editor > New query > coller > Run.
-- AVANT de lancer : remplacer CHOISIS-TON-CODE (étape 4) par le code du groupe.

-- 1. Empreinte du code, dans un schéma non exposé par l'API.
create schema if not exists prive;
revoke all on schema prive from public, anon, authenticated;
create table if not exists prive.ft_groupe (
  id int primary key default 1 check (id = 1),
  code_hash text not null,
  maj_le timestamptz not null default now()
);
revoke all on prive.ft_groupe from public, anon, authenticated;

-- 2. Vérification utilisée par les règles d'accès : lit l'en-tête x-code-groupe de la requête.
create or replace function public.ft_groupe_ok() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from prive.ft_groupe g
     where g.code_hash = encode(extensions.digest(
       coalesce(current_setting('request.headers', true)::json ->> 'x-code-groupe', ''), 'sha256'), 'hex'));
$$;
grant execute on function public.ft_groupe_ok() to anon, authenticated;

-- 3. Vérification appelée par la page à la saisie du code (ralentie pour limiter les essais en série).
create or replace function public.ft_groupe_verifier(p_code text) returns boolean
language plpgsql volatile security definer set search_path = '' as $$
begin
  perform pg_sleep(0.5);
  return exists (select 1 from prive.ft_groupe g
                  where g.code_hash = encode(extensions.digest(coalesce(p_code, ''), 'sha256'), 'hex'));
end $$;
grant execute on function public.ft_groupe_verifier(text) to anon, authenticated;

-- 4. Le code du groupe (à remplacer). Relancer seulement cette commande pour le changer plus tard.
insert into prive.ft_groupe (id, code_hash)
values (1, encode(extensions.digest('CHOISIS-TON-CODE', 'sha256'), 'hex'))
on conflict (id) do update set code_hash = excluded.code_hash, maj_le = now();

-- 5. Toutes les règles d'accès des tables ft_* exigent désormais le code.
--    Les tâches automatiques (rappels) passent par la base elle-même et ne sont pas concernées.
do $$
declare p record; cond text;
begin
  for p in select tablename, policyname, cmd, qual, with_check from pg_policies
            where schemaname = 'public' and tablename like 'ft\_%'
              and coalesce(qual, '') not like '%ft_groupe_ok%' and coalesce(with_check, '') not like '%ft_groupe_ok%'
  loop
    if p.cmd in ('SELECT', 'DELETE') then
      execute format('alter policy %I on public.%I using ((%s) and public.ft_groupe_ok())',
                     p.policyname, p.tablename, coalesce(p.qual, 'true'));
    elsif p.cmd = 'INSERT' then
      execute format('alter policy %I on public.%I with check ((%s) and public.ft_groupe_ok())',
                     p.policyname, p.tablename, coalesce(p.with_check, 'true'));
    else
      execute format('alter policy %I on public.%I using ((%s) and public.ft_groupe_ok()) with check ((%s) and public.ft_groupe_ok())',
                     p.policyname, p.tablename, coalesce(p.qual, 'true'), coalesce(p.with_check, p.qual, 'true'));
    end if;
  end loop;
end $$;

-- 6. Vérification : doit afficher 0 (aucune règle ft_* sans le code) et 1 (code enregistré).
select
  (select count(*) from pg_policies where schemaname = 'public' and tablename like 'ft\_%'
     and coalesce(qual, '') || coalesce(with_check, '') not like '%ft_groupe_ok%') as regles_sans_code,
  (select count(*) from prive.ft_groupe) as code_enregistre;
