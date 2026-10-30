import { NextResponse } from 'next/server';
import { db, getSession } from '@/lib/server';
const KINDS = ['lovelang', 'checkin', 'promise', 'date', 'story', 'letter', 'dream', 'sync', 'distance'];// Panic PIN: decoy data only, the real tables are never queried
const decoy = (kind: string) => kind === 'date'
  ? [{ id: 'd1', kind, payload: { title: 'Dentist', date: '2026-12-02' }, locked: false, mine: true }]
  : kind === 'promise' ? [{ id: 'd2', kind, payload: { text: 'Buy milk' }, locked: false, mine: true }] : [];
export async function GET(req: Request) {
  const s = await getSession(); if (!s) return NextResponse.json({ error: 'auth' }, { status: 401 });
  const kind = new URL(req.url).searchParams.get('kind') || '';
  if (!KINDS.includes(kind)) return NextResponse.json({ error: 'kind' }, { status: 400 });
  if (s.decoy) return NextResponse.json({ items: decoy(kind) });
  const { data } = await db.from('items').select('*').eq('couple_id', s.cid).eq('kind', kind).order('created_at', { ascending: false }).limit(100);
  const now = new Date();
  const items = (data || []).map((i: any) => {
    const timeLocked = i.sealed_until && new Date(i.sealed_until) > now;
    const bothLocked = i.needs_both && (i.opened_by || []).length < 2;
    const locked = timeLocked || bothLocked; // enforced here, locked payloads never leave the server
    return { id: i.id, kind, locked, mine: i.author === s.mid, sealed_until: i.sealed_until, needs_both: i.needs_both,
      iOpened: (i.opened_by || []).includes(s.mid), created_at: i.created_at, payload: locked ? null : i.payload };
  });
  return NextResponse.json({ items });
}
export async function POST(req: Request) {
  const s = await getSession(); if (!s) return NextResponse.json({ error: 'auth' }, { status: 401 });
  if (s.decoy) return NextResponse.json({ ok: true });
  const { kind, payload, sealed_until, needs_both } = await req.json();
  if (!KINDS.includes(kind)) return NextResponse.json({ error: 'kind' }, { status: 400 });
  await db.from('items').insert({ couple_id: s.cid, author: s.mid, kind, payload, sealed_until: sealed_until || null, needs_both: !!needs_both, opened_by: [] });
  return NextResponse.json({ ok: true });
}
export async function PATCH(req: Request) {
  const s = await getSession(); if (!s || s.decoy) return NextResponse.json({ ok: true });
  const { id, action } = await req.json();
  const { data: i } = await db.from('items').select('opened_by,couple_id,payload').eq('id', id).single();
  if (!i || i.couple_id !== s.cid) return NextResponse.json({ error: 'nope' }, { status: 404 });
  if (action === 'toggle') await db.from('items').update({ payload: { ...i.payload, done: !i.payload.done } }).eq('id', id);
  else await db.from('items').update({ opened_by: Array.from(new Set([...(i.opened_by || []), s.mid])) }).eq('id', id);
  return NextResponse.json({ ok: true });
}
