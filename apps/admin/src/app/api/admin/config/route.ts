import { proxyJson } from '@/lib/proxy';

export async function GET(req: Request) {
  return proxyJson(req, '/api/v1/admin/config', 'GET');
}
