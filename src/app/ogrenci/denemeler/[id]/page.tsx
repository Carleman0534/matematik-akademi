import { redirect } from 'next/navigation';

export default async function DenemelerIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/ogrenci/deneme/${id}`);
}
