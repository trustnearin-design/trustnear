import { proxyMultipart } from '@/lib/proxy';

export async function POST(req: Request) {
  return proxyMultipart(req, '/api/v1/admin/uploads');
}
