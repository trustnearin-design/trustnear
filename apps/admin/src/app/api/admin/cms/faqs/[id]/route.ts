import { proxyJson } from '@/lib/proxy';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyJson(req, `/api/v1/admin/cms/faqs/${id}`, 'GET');
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyJson(req, `/api/v1/admin/cms/faqs/${id}`, 'PATCH');
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyJson(req, `/api/v1/admin/cms/faqs/${id}`, 'DELETE');
}
