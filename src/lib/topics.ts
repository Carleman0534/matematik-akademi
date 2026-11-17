// Konu ağacı yardımcıları (ünite → konu → alt konu; sınırsız seviye)

export interface Topic { id: string; parent_id: string | null; name: string; grade_level: number | null; sort_order: number }
export interface TopicNode extends Topic { children: TopicNode[]; depth: number }

export function buildTree(flat: Topic[]): TopicNode[] {
  const byId = new Map<string, TopicNode>(flat.map(t => [t.id, { ...t, children: [], depth: 0 }]));
  const roots: TopicNode[] = [];
  for (const n of byId.values()) {
    const p = n.parent_id ? byId.get(n.parent_id) : null;
    if (p) p.children.push(n); else roots.push(n);
  }
  const sort = (list: TopicNode[], depth: number) => {
    list.sort((a, b) => (a.grade_level ?? 99) - (b.grade_level ?? 99) || a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'tr'));
    list.forEach(n => { n.depth = depth; sort(n.children, depth + 1); });
  };
  sort(roots, 0);
  return roots;
}

// Bir konunun kendisi ve tüm alt konuları (filtrede ünite seçilince içindeki konular da gelsin)
export function descendantIds(flat: Topic[], id: string): string[] {
  const kids = new Map<string, string[]>();
  flat.forEach(t => { if (t.parent_id) kids.set(t.parent_id, [...(kids.get(t.parent_id) || []), t.id]); });
  const out: string[] = [];
  const walk = (x: string) => { out.push(x); (kids.get(x) || []).forEach(walk); };
  if (flat.some(t => t.id === id)) walk(id);
  return out;
}

export function topicPath(flat: Topic[], id: string | null | undefined): string {
  if (!id) return '';
  const byId = new Map(flat.map(t => [t.id, t]));
  const parts: string[] = [];
  let cur = byId.get(id);
  let guard = 0;
  while (cur && guard++ < 20) { parts.unshift(cur.name); cur = cur.parent_id ? byId.get(cur.parent_id) : undefined; }
  return parts.join(' › ');
}

// Seçim kutusu için düz liste: girintili ad ve sınıf düzeyi
export function flattenForSelect(tree: TopicNode[]): { id: string; label: string; depth: number; grade: number | null }[] {
  const out: { id: string; label: string; depth: number; grade: number | null }[] = [];
  const walk = (list: TopicNode[]) => list.forEach(n => { out.push({ id: n.id, label: n.name, depth: n.depth, grade: n.grade_level }); walk(n.children); });
  walk(tree);
  return out;
}
