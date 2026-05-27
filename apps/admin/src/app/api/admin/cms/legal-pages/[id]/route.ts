import { proxyJson } from '@/lib/proxy';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyJson(req, `/api/v1/admin/cms/legal-pages/${id}`, 'GET');
}
