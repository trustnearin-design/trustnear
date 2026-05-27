import { proxyJson } from '@/lib/proxy';

export async function POST(req: Request) {
  return proxyJson(req, '/api/v1/admin/users/bulk-active', 'POST');
}
