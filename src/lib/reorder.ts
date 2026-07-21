import { supabase } from "@/lib/supabase";

type TableName = "projects" | "certificates" | "tech_stack";

type OrderableItem = { id: string | number; sort_order?: number | null };

/**
 * Persiste a nova ordem dos itens gravando `sort_order = índice` para cada um.
 * Só grava os itens cuja posição realmente mudou, para reduzir escritas.
 */
export async function persistOrder(
  table: TableName,
  items: OrderableItem[]
): Promise<void> {
  const updates = items
    .map((item, index) => ({ item, index }))
    .filter(({ item, index }) => item.sort_order !== index)
    .map(({ item, index }) =>
      supabase.from(table).update({ sort_order: index }).eq("id", item.id)
    );

  if (updates.length === 0) return;

  await Promise.all(updates);
}

/** Retorna o próximo valor de `sort_order` (final da lista). */
export function nextSortOrder(items: OrderableItem[]): number {
  if (items.length === 0) return 0;

  return (
    items.reduce(
      (max, item) => Math.max(max, item.sort_order ?? -1),
      -1
    ) + 1
  );
}
