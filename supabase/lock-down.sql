-- Poliba Corse · Cost & Emissions
-- Da eseguire quando si passa dalla fase sperimentale alla fase "solo email
-- abilitate". Richiude la scrittura a chi non ha effettuato l'accesso.
-- Accompagnare con NEXT_PUBLIC_AUTH_ENABLED=true nell'app.

drop policy if exists assemblies_insert on public.assemblies;
create policy assemblies_insert on public.assemblies for insert to authenticated with check (true);
drop policy if exists assemblies_update on public.assemblies;
create policy assemblies_update on public.assemblies for update to authenticated using (true) with check (true);
drop policy if exists assemblies_delete on public.assemblies;
create policy assemblies_delete on public.assemblies for delete to authenticated using (true);

drop policy if exists components_insert on public.components;
create policy components_insert on public.components for insert to authenticated with check (true);
drop policy if exists components_update on public.components;
create policy components_update on public.components for update to authenticated using (true) with check (true);
drop policy if exists components_delete on public.components;
create policy components_delete on public.components for delete to authenticated using (true);
