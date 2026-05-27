import { proxyJson } from '@/lib/proxy';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyJson(req, `/api/v1/admin/cms/announcements/${id}`, 'GET');
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyJson(req, `/api/v1/admin/cms/announcements/${id}`, 'DELETE');
}
