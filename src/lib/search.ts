import { sql } from "drizzle-orm";
import type { Db } from "@/db/client";

import type { Category } from "@/db/enum-values";

export type SearchResult = { id: string; name: string; slug: string; category: Category; score: number };

/** Ricerca fuzzy (solo prodotti pubblicati, salvo includeDrafts) (pg_trgm) su nome e alias: "sg7", "speedgoat VII" → Hoka Speedgoat 7. */
export async function searchProducts(
  db: Db,
  q: string,
  limit = 20,
  opts: { includeDrafts?: boolean } = {},
): Promise<SearchResult[]> {
  const query = q.trim().slice(0, 60);
  if (query.length < 2) return [];
  const like = `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const res = await db.execute<SearchResult>(sql`
    select p.id, p.display_name as name, p.slug, m.category,
      max(greatest(
        similarity(p.display_name, ${query}),
        coalesce(similarity(a.alias, ${query}), 0),
        case when p.display_name ilike ${like} or a.alias ilike ${like} then 1 else 0 end
      ))::float as score
    from products p
    join models m on m.id = p.model_id
    left join product_aliases a on a.product_id = p.id
    where (${opts.includeDrafts ?? false} or p.status = 'pubblicato')
      and (p.display_name % ${query} or a.alias % ${query}
           or p.display_name ilike ${like} or a.alias ilike ${like}
           or word_similarity(${query}, p.display_name) > 0.5)
    group by p.id, p.display_name, p.slug, m.category
    order by score desc, p.display_name
    limit ${limit}`);
  return (Array.isArray(res) ? res : (res as { rows: SearchResult[] }).rows) as SearchResult[];
}
