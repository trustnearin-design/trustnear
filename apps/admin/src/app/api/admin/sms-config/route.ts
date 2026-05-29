import { proxyJson } from '@/lib/proxy';

export async function GET(req: Request) {
  return proxyJson(req, '/api/v1/admin/sms-config', 'GET');
}

export async function PUT(req: Request) {
  return proxyJson(req, '/api/v1/admin/sms-config', 'PUT');
}
