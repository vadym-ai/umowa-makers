alter table public.companies
  add column if not exists krs text,
  add column if not exists regon text,
  add column if not exists city text;

alter table public.contractors
  add column if not exists document_number text,
  add column if not exists tax_office text,
  add column if not exists bank_account text,
  add column if not exists email text,
  add column if not exists phone text;

alter table public.numbering_rules alter column prefix set default '';
alter table public.numbering_rules alter column format set default '{N}/{MM}/{YYYY}';
update public.numbering_rules set prefix = '', format = '{N}/{MM}/{YYYY}';