import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { db, setSession, getSession } from '@/lib/server';
const bad = (m = 'Wrong details', s = 401) => NextResponse.json({ error: m }, { status: s });
const ok = () => NextResponse.json({ ok: true });
export async function GET() { return NextResponse.json({ in: !!(await getSession()) }); }
export async function POST(req: Request) {
  const { action, code, name, pin, panic } = await req.json();
  if (action === 'logout') { (await cookies()).delete('s'); return ok(); }
  if (!/^[a-z0-9-]{6,32}$/i.test(code || '') || !name || !/^\d{4}$/.test(pin || '')) return bad('Couple code (6+ letters/numbers), name and 4-digit PIN needed', 400);
  const c = code.toLowerCase();
  if (action === 'create') {
    if (!/^\d{4}$/.test(panic || '') || panic === pin) return bad('Panic PIN must be 4 digits and differ from PIN', 400);
    let { data: couple } = await db.from('couples').select('id').eq('code', c).maybeSingle();
    if (!couple) couple = (await db.from('couples').insert({ code: c }).select('id').single()).data;
    const { count } = await db.from('members').select('id', { count: 'exact', head: true }).eq('couple_id', couple!.id);
    if ((count || 0) >= 2) return bad('That space is full', 403);
    const { data: m, error } = await db.from('members').insert({ couple_id: couple!.id, name, pin_hash: await bcrypt.hash(pin, 10), panic_hash: await bcrypt.hash(panic, 10) }).select('id').single();
    if (error) return bad('Name already used in this space', 409);
    await setSession({ mid: m!.id, cid: couple!.id, decoy: false });
    return ok();
  }
  const { data: couple } = await db.from('couples').select('id').eq('code', c).maybeSingle();
  const { data: m } = couple ? await db.from('members').select('*').eq('couple_id', couple.id).eq('name', name).maybeSingle() : { data: null };
  if (!m) return bad();
  if (m.locked_until && new Date(m.locked_until) > new Date()) return bad('Too many tries. Try again in 15 minutes.', 429);
  const real = await bcrypt.compare(pin, m.pin_hash);
  const fake = !real && (await bcrypt.compare(pin, m.panic_hash));
  if (real || fake) {
    await db.from('members').update({ failed: 0, locked_until: null }).eq('id', m.id);
    await setSession({ mid: m.id, cid: m.couple_id, decoy: fake });
    return ok();
  }
  const failed = (m.failed || 0) + 1;
  await db.from('members').update({ failed, locked_until: failed >= 5 ? new Date(Date.now() + 15 * 60000).toISOString() : null }).eq('id', m.id);
  return bad();
}
