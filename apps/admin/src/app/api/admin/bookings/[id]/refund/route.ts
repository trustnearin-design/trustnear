import { proxyJson } from '@/lib/proxy';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyJson(req, `/api/v1/admin/bookings/${id}/refund`, 'POST');
}
