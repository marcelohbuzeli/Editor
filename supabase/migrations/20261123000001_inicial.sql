-- Meu Editor: banco de cada comprador (projeto Supabase próprio do Editor, separado do Dashplassô).
-- Cada usuário só enxerga as próprias linhas e a própria pasta no Storage (RLS por auth.uid()).

-- ---------- perfis ----------
create table if not exists public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  nome text,
  plano text not null default 'nenhum',
  creditos integer not null default 0 check (creditos >= 0),
  status text not null default 'ativo' check (status in ('ativo', 'bloqueado')),
  kit jsonb not null default '{}'::jsonb,          -- kit da marca: logo, nome, cores, fontes, briefing, referências
  kiwify jsonb not null default '{}'::jsonb,       -- último pedido da Kiwify (só leitura para o usuário)
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists perfis_email_idx on public.perfis (lower(email));

alter table public.perfis enable row level security;
drop policy if exists "perfil: ler o próprio" on public.perfis;
create policy "perfil: ler o próprio" on public.perfis for select to authenticated using (id = auth.uid());
drop policy if exists "perfil: editar o próprio kit" on public.perfis;
create policy "perfil: editar o próprio kit" on public.perfis for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
-- o usuário só pode mudar o kit e o nome; plano, créditos e status só pelo servidor
revoke insert, update, delete on public.perfis from anon, authenticated;
grant select on public.perfis to authenticated;
grant update (kit, nome) on public.perfis to authenticated;

-- acesso liberado = perfil ativo
create or replace function public.tem_acesso() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfis where id = auth.uid() and status = 'ativo');
$$;
revoke execute on function public.tem_acesso() from public, anon;
grant execute on function public.tem_acesso() to authenticated;

-- cria o perfil quando o usuário nasce (convite do webhook ou criação pelo painel)
create or replace function public.novo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfis (id, email) values (new.id, new.email) on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario after insert on auth.users for each row execute function public.novo_usuario();

create or replace function public.tocar_atualizado() returns trigger language plpgsql as $$
begin new.atualizado_em = now(); return new; end $$;
drop trigger if exists perfis_tocar on public.perfis;
create trigger perfis_tocar before update on public.perfis for each row execute function public.tocar_atualizado();

-- ---------- projetos (galeria) ----------
create table if not exists public.projetos (
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  data jsonb not null default '{}'::jsonb,         -- só dados leves; o projeto inteiro fica no Storage
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  primary key (owner, id)
);
create index if not exists projetos_owner_data_idx on public.projetos (owner, atualizado_em desc);
drop trigger if exists projetos_tocar on public.projetos;
create trigger projetos_tocar before update on public.projetos for each row execute function public.tocar_atualizado();

alter table public.projetos enable row level security;
drop policy if exists "projetos: só o dono" on public.projetos;
create policy "projetos: só o dono" on public.projetos for all to authenticated
  using (owner = auth.uid() and public.tem_acesso())
  with check (owner = auth.uid() and public.tem_acesso());
revoke all on public.projetos from anon;
grant select, insert, update, delete on public.projetos to authenticated;

-- ---------- Storage: bucket privado "projetos", uma pasta por usuário ----------
insert into storage.buckets (id, name, public, file_size_limit)
values ('projetos', 'projetos', false, 52428800)
on conflict (id) do update set public = false;

drop policy if exists "projetos: pasta do dono (ler)" on storage.objects;
create policy "projetos: pasta do dono (ler)" on storage.objects for select to authenticated
  using (bucket_id = 'projetos' and (storage.foldername(name))[1] = auth.uid()::text and public.tem_acesso());
drop policy if exists "projetos: pasta do dono (criar)" on storage.objects;
create policy "projetos: pasta do dono (criar)" on storage.objects for insert to authenticated
  with check (bucket_id = 'projetos' and (storage.foldername(name))[1] = auth.uid()::text and public.tem_acesso());
drop policy if exists "projetos: pasta do dono (trocar)" on storage.objects;
create policy "projetos: pasta do dono (trocar)" on storage.objects for update to authenticated
  using (bucket_id = 'projetos' and (storage.foldername(name))[1] = auth.uid()::text and public.tem_acesso())
  with check (bucket_id = 'projetos' and (storage.foldername(name))[1] = auth.uid()::text and public.tem_acesso());
drop policy if exists "projetos: pasta do dono (apagar)" on storage.objects;
create policy "projetos: pasta do dono (apagar)" on storage.objects for delete to authenticated
  using (bucket_id = 'projetos' and (storage.foldername(name))[1] = auth.uid()::text and public.tem_acesso());

-- ---------- créditos ----------
-- Debita de forma atômica: só desconta se houver saldo e o acesso estiver ativo. Devolve o saldo novo.
create or replace function public.gastar_creditos(qtd integer) returns integer
language plpgsql security definer set search_path = public as $$
declare saldo integer;
begin
  if auth.uid() is null then raise exception 'sem_login' using errcode = '28000'; end if;
  if qtd is null or qtd <= 0 or qtd > 100 then raise exception 'quantidade_invalida' using errcode = '22023'; end if;
  update public.perfis set creditos = creditos - qtd
    where id = auth.uid() and status = 'ativo' and creditos >= qtd
    returning creditos into saldo;
  if saldo is null then raise exception 'creditos_insuficientes' using errcode = 'P0001'; end if;
  return saldo;
end $$;
revoke execute on function public.gastar_creditos(integer) from public, anon;
grant execute on function public.gastar_creditos(integer) to authenticated;

-- ---------- eventos da Kiwify (só o servidor lê e grava) ----------
create table if not exists public.kiwify_eventos (
  chave text primary key,              -- pedido + tipo de evento: evita processar duas vezes
  email text,
  evento text,
  recebido_em timestamptz not null default now(),
  corpo jsonb
);
alter table public.kiwify_eventos enable row level security;
revoke all on public.kiwify_eventos from anon, authenticated;
