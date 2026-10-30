-- Protection des suppressions par le code à 4 chiffres.
-- À exécuter une fois dans Supabase : SQL Editor > New query > coller > Run.
-- 1. Fonctions de suppression : elles vérifient le code puis suppriment seulement ce que la personne a créé.
create or replace function public.ft_supprimer_activite(p_id uuid, p_prenom text, p_code text) returns integer
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if not public.ft_code_verifier(p_prenom, p_code) then raise exception 'code' using errcode = '28000'; end if;
  delete from public.ft_activites where id = p_id and lower(trim(organisateur)) = lower(trim(p_prenom));
  get diagnostics n = row_count; return n;
end $$;

create or replace function public.ft_supprimer_serie(p_serie uuid, p_date date, p_prenom text, p_code text) returns integer
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if not public.ft_code_verifier(p_prenom, p_code) then raise exception 'code' using errcode = '28000'; end if;
  delete from public.ft_activites where serie_id = p_serie and date >= p_date and lower(trim(organisateur)) = lower(trim(p_prenom));
  get diagnostics n = row_count; return n;
end $$;

create or replace function public.ft_supprimer_seance(p_id uuid, p_prenom text, p_code text) returns integer
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if not public.ft_code_verifier(p_prenom, p_code) then raise exception 'code' using errcode = '28000'; end if;
  delete from public.ft_seances where id = p_id and lower(trim(auteur)) = lower(trim(p_prenom));
  get diagnostics n = row_count; return n;
end $$;

create or replace function public.ft_supprimer_programme(p_id uuid, p_prenom text, p_code text) returns integer
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if not public.ft_code_verifier(p_prenom, p_code) then raise exception 'code' using errcode = '28000'; end if;
  delete from public.ft_programmes where id = p_id and lower(trim(auteur)) = lower(trim(p_prenom));
  get diagnostics n = row_count; return n;
end $$;

create or replace function public.ft_supprimer_lieu(p_id uuid, p_prenom text, p_code text) returns integer
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if not public.ft_code_verifier(p_prenom, p_code) then raise exception 'code' using errcode = '28000'; end if;
  delete from public.ft_lieux where id = p_id and lower(trim(auteur)) = lower(trim(p_prenom));
  get diagnostics n = row_count; return n;
end $$;

-- 2. Plus de suppression directe des activités et des séances : uniquement par les fonctions ci-dessus.
drop policy if exists ft_act_delete on public.ft_activites;
drop policy if exists ft_se_delete on public.ft_seances;
