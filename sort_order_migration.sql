-- ========================================
-- MIGRATION: ordenação manual (sort_order)
-- Rode este script no SQL Editor do Supabase.
-- Seguro para rodar mais de uma vez.
-- ========================================

-- 1) Adiciona a coluna sort_order em cada tabela
ALTER TABLE public.projects     ADD COLUMN IF NOT EXISTS sort_order integer;
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS sort_order integer;
ALTER TABLE public.tech_stack   ADD COLUMN IF NOT EXISTS sort_order integer;

-- 2) Preenche a ordem inicial com base na data de criação (mais antigo primeiro)
WITH ordered AS (
  SELECT id, (ROW_NUMBER() OVER (ORDER BY created_at ASC) - 1) AS rn
  FROM public.projects
)
UPDATE public.projects p
SET sort_order = ordered.rn
FROM ordered
WHERE p.id = ordered.id
  AND p.sort_order IS NULL;

WITH ordered AS (
  SELECT id, (ROW_NUMBER() OVER (ORDER BY created_at ASC) - 1) AS rn
  FROM public.certificates
)
UPDATE public.certificates c
SET sort_order = ordered.rn
FROM ordered
WHERE c.id = ordered.id
  AND c.sort_order IS NULL;

WITH ordered AS (
  SELECT id, (ROW_NUMBER() OVER (ORDER BY created_at ASC) - 1) AS rn
  FROM public.tech_stack
)
UPDATE public.tech_stack t
SET sort_order = ordered.rn
FROM ordered
WHERE t.id = ordered.id
  AND t.sort_order IS NULL;

-- 3) Índices para acelerar a ordenação
CREATE INDEX IF NOT EXISTS idx_projects_sort_order     ON public.projects(sort_order);
CREATE INDEX IF NOT EXISTS idx_certificates_sort_order ON public.certificates(sort_order);
CREATE INDEX IF NOT EXISTS idx_tech_stack_sort_order   ON public.tech_stack(sort_order);
