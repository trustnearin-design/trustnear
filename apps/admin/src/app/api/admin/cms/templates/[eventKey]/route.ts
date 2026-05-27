import { proxyJson } from '@/lib/proxy';

export async function GET(req: Request, { params }: { params: Promise<{ eventKey: string }> }) {
  const { eventKey } = await params;
  return proxyJson(req, `/api/v1/admin/cms/templates/${encodeURIComponent(eventKey)}`, 'GET');
}

export async function PUT(req: Request, { params }: { params: Promise<{ eventKey: string }> }) {
  const { eventKey } = await params;
  return proxyJson(req, `/api/v1/admin/cms/templates/${encodeURIComponent(eventKey)}`, 'PUT');
}
