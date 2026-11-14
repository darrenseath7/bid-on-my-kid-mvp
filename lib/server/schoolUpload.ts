import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from '@/lib/adminSession';

export function database() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('School upload database is not configured.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function schoolIdentity(request: NextRequest) {
  const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1];
  if (!token) return null;
  const db = database();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user?.email || !data.user.email_confirmed_at) return null;
  return data.user.email.toLowerCase();
}

export async function adminIdentity(request: NextRequest) {
  const session = await verifyAdminSessionToken(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  const allowed = (process.env.ADMIN_ALLOWED_EMAILS || '').split(',').map(x => x.trim().toLowerCase());
  return session && allowed.includes(session.email.toLowerCase()) ? session.email : null;
}

export function schoolCode(value: string | null) {
  return value && /^[a-z0-9][a-z0-9-]{0,79}$/.test(value) ? value : null;
}

export function responseError(message: string, status = 400) {
  return Response.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
}
