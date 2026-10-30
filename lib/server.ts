import { createClient } from '@supabase/supabase-js';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
export const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
const key = new TextEncoder().encode(process.env.SESSION_SECRET!);
export async function setSession(s: { mid: string; cid: string; decoy: boolean }) {
  const t = await new SignJWT(s).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('7d').sign(key);
  (await cookies()).set('s', t, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 604800 });
}
export async function getSession(): Promise<any> {
  const c = (await cookies()).get('s')?.value;
  if (!c) return null;
  try { return (await jwtVerify(c, key)).payload; } catch { return null; }
}
