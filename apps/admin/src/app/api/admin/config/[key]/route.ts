import { proxyJson } from '@/lib/proxy';

export async function PUT(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return proxyJson(req, `/api/v1/admin/config/${encodeURIComponent(key)}`, 'PUT');
}

export async function DELETE(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return proxyJson(req, `/api/v1/admin/config/${encodeURIComponent(key)}`, 'DELETE');
}
