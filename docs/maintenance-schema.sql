-- ════════════════════════════════════════════════════════════════════
--  R2C-Scan — Módulo de MANUTENÇÃO INDUSTRIAL (Ordens de Serviço)
--  Schema normalizado para Supabase / PostgreSQL
--  Aditivo: NÃO altera nenhuma tabela existente (products, maintenance,
--  stock_items, suppliers, scan_history, users, stock_movements).
--  v2.1
-- ════════════════════════════════════════════════════════════════════

-- ── Extensões necessárias ──────────────────────────────────────────
create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- ════════════════════════════════════════════════════════════════════
--  1) ORDENS DE SERVIÇO  (maintenance_orders)
-- ════════════════════════════════════════════════════════════════════
create table if not exists maintenance_orders (
  id              uuid primary key default gen_random_uuid(),
  os_number       text unique not null,                 -- nº automático (OS-2026-0001)
  opened_at       timestamptz not null default now(),   -- data de abertura
  due_at          timestamptz,                           -- data prevista
  closed_at       timestamptz,                           -- data de conclusão
  requester       text,                                  -- solicitante
  technician      text,                                  -- responsável técnico
  priority        text not null default 'media'
                   check (priority in ('baixa','media','alta','critica')),
  type            text not null default 'corretiva'
                   check (type in ('corretiva','preventiva','preditiva','inspecao')),
  equipment       text,                                  -- equipamento vinculado (texto livre)
  asset_id        text,                                  -- patrimônio / id do ativo (products.id)
  patrimony       text,                                  -- nº de patrimônio
  sector          text,                                  -- setor
  location        text,                                  -- localização
  failure_desc    text,                                  -- descrição da falha
  diagnosis       text,                                  -- diagnóstico
  root_cause      text,                                  -- causa raiz
  solution        text,                                  -- solução aplicada
  notes           text,                                  -- observações
  status          text not null default 'aberta'
                   check (status in ('aberta','analise','aguardando_material',
                                     'execucao','aguardando_aprovacao','concluida','cancelada')),
  labor_cost      numeric(12,2) not null default 0,      -- custo de mão de obra
  thirdparty_cost numeric(12,2) not null default 0,      -- custo de terceiros
  additional_cost numeric(12,2) not null default 0,      -- custos adicionais
  materials_cost  numeric(12,2) not null default 0,      -- soma dos materiais (cache)
  total_cost      numeric(12,2) not null default 0,      -- custo total (cache)
  created_by      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_mo_status     on maintenance_orders (status);
create index if not exists idx_mo_priority   on maintenance_orders (priority);
create index if not exists idx_mo_type       on maintenance_orders (type);
create index if not exists idx_mo_asset      on maintenance_orders (asset_id);
create index if not exists idx_mo_sector     on maintenance_orders (sector);
create index if not exists idx_mo_opened     on maintenance_orders (opened_at desc);
create index if not exists idx_mo_due        on maintenance_orders (due_at);

-- ════════════════════════════════════════════════════════════════════
--  2) FOTOS / ANEXOS  (maintenance_photos)
-- ════════════════════════════════════════════════════════════════════
create table if not exists maintenance_photos (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references maintenance_orders(id) on delete cascade,
  phase       text not null default 'antes'
               check (phase in ('antes','durante','depois','video','documento','manual')),
  url         text not null,        -- url pública OU data-uri (offline)
  caption     text,
  mime        text,                 -- image/jpeg, video/mp4, application/pdf …
  uploaded_by text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_mph_order on maintenance_photos (order_id);
create index if not exists idx_mph_phase on maintenance_photos (order_id, phase);

-- ════════════════════════════════════════════════════════════════════
--  3) ANDAMENTO / TIMELINE  (maintenance_history)
-- ════════════════════════════════════════════════════════════════════
create table if not exists maintenance_history (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references maintenance_orders(id) on delete cascade,
  event      text not null,         -- "Ordem criada", "Técnico designado", "Status: execução"…
  note       text,                  -- observação livre
  username   text,                  -- usuário que registrou
  created_at timestamptz not null default now()
);

create index if not exists idx_mh_order on maintenance_history (order_id, created_at);

-- ════════════════════════════════════════════════════════════════════
--  4) MATERIAIS UTILIZADOS  (maintenance_materials)
-- ════════════════════════════════════════════════════════════════════
create table if not exists maintenance_materials (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references maintenance_orders(id) on delete cascade,
  stock_id    text,                 -- referência ao item de estoque (stock_items.id)
  code        text,                 -- código do material
  name        text not null,
  category    text,
  quantity    numeric(12,3) not null default 1,
  unit        text default 'un',
  unit_price  numeric(12,2) not null default 0,
  total_price numeric(12,2) generated always as (quantity * unit_price) stored,
  created_at  timestamptz not null default now()
);

create index if not exists idx_mm_order on maintenance_materials (order_id);
create index if not exists idx_mm_stock on maintenance_materials (stock_id);

-- ════════════════════════════════════════════════════════════════════
--  5) CUSTOS DETALHADOS  (maintenance_costs)  — linhas de custo avulsas
-- ════════════════════════════════════════════════════════════════════
create table if not exists maintenance_costs (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references maintenance_orders(id) on delete cascade,
  kind        text not null default 'adicional'
               check (kind in ('mao_de_obra','material','terceiros','adicional')),
  description text,
  amount      numeric(12,2) not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists idx_mc_order on maintenance_costs (order_id);

-- ════════════════════════════════════════════════════════════════════
--  6) RELATÓRIOS SALVOS  (maintenance_reports)
-- ════════════════════════════════════════════════════════════════════
create table if not exists maintenance_reports (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  kind        text not null default 'os',   -- os | custos | materiais | fornecedores
  filters     jsonb default '{}'::jsonb,
  payload     jsonb,                          -- snapshot dos dados
  created_by  text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_mr_kind on maintenance_reports (kind, created_at desc);

-- ════════════════════════════════════════════════════════════════════
--  7) FORNECEDORES (extensão)  — colunas adicionais em suppliers
--     Aditivo: usa ADD COLUMN IF NOT EXISTS, não recria a tabela.
-- ════════════════════════════════════════════════════════════════════
alter table if exists suppliers add column if not exists trade_name  text;  -- nome fantasia
alter table if exists suppliers add column if not exists whatsapp    text;
alter table if exists suppliers add column if not exists responsible text;  -- responsável

-- Caso a tabela suppliers ainda não exista neste ambiente, cria completa:
create table if not exists suppliers (
  id          text primary key,
  name        text not null,            -- razão social
  trade_name  text,                     -- nome fantasia
  cnpj        text,
  ie          text,
  contact     text,
  responsible text,
  phone       text,
  whatsapp    text,
  email       text,
  address     text,
  category    text,                     -- Elétrica, Mecânica, Hidráulica, Pneumática…
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_sup_category on suppliers (category);

-- ════════════════════════════════════════════════════════════════════
--  8) LISTA DE COMPRAS / REQUISIÇÕES  (purchase_requests)
-- ════════════════════════════════════════════════════════════════════
create table if not exists purchase_requests (
  id             uuid primary key default gen_random_uuid(),
  stock_id       text,                  -- item de estoque relacionado
  material       text not null,
  quantity       numeric(12,3) not null default 1,
  unit           text default 'un',
  supplier_id    text references suppliers(id),
  last_price     numeric(12,2),         -- último preço pago
  order_id       uuid references maintenance_orders(id) on delete set null,
  status         text not null default 'pendente'
                  check (status in ('pendente','cotado','comprado','recebido','cancelado')),
  created_by     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_pr_status   on purchase_requests (status);
create index if not exists idx_pr_supplier on purchase_requests (supplier_id);
create index if not exists idx_pr_stock    on purchase_requests (stock_id);

-- ════════════════════════════════════════════════════════════════════
--  9) TRIGGER — recalcula custos da OS automaticamente
-- ════════════════════════════════════════════════════════════════════
create or replace function recalc_order_costs() returns trigger as $$
declare
  v_order uuid := coalesce(new.order_id, old.order_id);
  v_mat   numeric(12,2);
begin
  select coalesce(sum(total_price),0) into v_mat
    from maintenance_materials where order_id = v_order;

  update maintenance_orders mo
     set materials_cost = v_mat,
         total_cost = v_mat + mo.labor_cost + mo.thirdparty_cost + mo.additional_cost,
         updated_at = now()
   where mo.id = v_order;

  return null;
end;
$$ language plpgsql;

drop trigger if exists trg_recalc_materials on maintenance_materials;
create trigger trg_recalc_materials
  after insert or update or delete on maintenance_materials
  for each row execute function recalc_order_costs();

-- ════════════════════════════════════════════════════════════════════
--  10) VIEW de KPIs (opcional, acelera o dashboard)
-- ════════════════════════════════════════════════════════════════════
create or replace view v_maintenance_kpis as
select
  count(*)                                                          as total,
  count(*) filter (where status not in ('concluida','cancelada'))   as abertas,
  count(*) filter (where status = 'concluida')                      as concluidas,
  count(*) filter (where status not in ('concluida','cancelada')
                     and due_at is not null and due_at < now())      as atrasadas,
  coalesce(avg(extract(epoch from (closed_at - opened_at))/3600)
           filter (where status='concluida' and closed_at is not null),0) as mttr_horas,
  coalesce(sum(total_cost),0)                                       as custo_total
from maintenance_orders;
