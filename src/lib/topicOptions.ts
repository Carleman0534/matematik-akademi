import { buildTree, type Topic, type TopicNode } from './topics.ts';

// Seçim kutusu seçenekleri: her konunun ait olduğu ünitenin sınıf düzeyi (rootGrade) ile
export function topicOptions(flat: Topic[]) {
  const out: { id: string; label: string; depth: number; grade: number | null; rootGrade: number | null }[] = [];
  const walk = (list: TopicNode[], rootGrade: number | null) => list.forEach(n => {
    const g = n.depth === 0 ? n.grade_level : rootGrade;
    out.push({ id: n.id, label: n.name, depth: n.depth, grade: n.grade_level, rootGrade: g });
    walk(n.children, g);
  });
  walk(buildTree(flat), null);
  return out;
}
