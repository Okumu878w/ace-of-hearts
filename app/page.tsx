'use client';
import { useEffect, useState, useCallback } from 'react';
type F = { k: string; l: string; t: 'text' | 'area' | 'date' | 'mood' | 'url' | 'lang' };
const api = async (u: string, o?: any) => {
  try {
    const r = await fetch(u, o && { method: o.m || 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(o.b) });
    return await r.json();
  } catch { return { error: 'Server error. Check the terminal running npm run dev.' }; }
};
const LANGS: Record<string, string> = {
  Words: 'Send one specific compliment today.', Time: 'Offer 20 undivided minutes, phone away.',
  Gifts: 'Bring a tiny surprise, even a snack.', Service: 'Take one chore off their plate.', Touch: 'Give a long hug or hand hold.' };
const LDESC: Record<string, string> = {
  Words: 'Hearing "I love you" and compliments', Time: 'Undivided time together', Gifts: 'Thoughtful little gifts',
  Service: 'Help with things I need done', Touch: 'Hugs and physical closeness' };
const STOP = new Set('the a an and or of to in on at was were is it i we you my me with that this for from had have but not as so be been then there they them our'.split(' '));
const daysTo = (d: string) => { const n = Math.ceil((new Date(d).getTime() - Date.now()) / 864e5); return n >= 0 ? `in ${n} day(s)` : 'passed'; };
const clock = (tz: string) => { try { return new Date().toLocaleTimeString([], { timeZone: tz, hour: '2-digit', minute: '2-digit' }) + ' there'; } catch { return ''; } };

function Section({ kind, title, hint, fields, seal, toggle, extra, after }: { kind: string; title: string; hint?: string; fields: F[]; seal?: boolean; toggle?: boolean; extra?: (p: any) => string; after?: (items: any[]) => React.ReactNode }) {
  const [items, setItems] = useState<any[]>([]); const [v, setV] = useState<any>({}); const [until, setUntil] = useState(''); const [both, setBoth] = useState(false);
  const load = useCallback(async () => setItems((await api('/api/items?kind=' + kind)).items || []), [kind]);
  useEffect(() => { load(); }, [load]);
  const add = async () => {
    if (!Object.values(v).some(Boolean)) return;
    await api('/api/items', { b: { kind, payload: v, sealed_until: until ? new Date(until).toISOString() : null, needs_both: both } });
    setV({}); setUntil(''); setBoth(false); load();
  };
  const patch = async (id: string, action?: string) => { await api('/api/items', { m: 'PATCH', b: { id, action } }); load(); };
  return <section className="card">
    <h2 className="font-semibold mb-1">{title}</h2>{hint && <p className="text-xs text-rose-400 mb-3">{hint}</p>}
    {fields.map(f => f.t === 'area' ? <textarea key={f.k} className="inp" rows={3} placeholder={f.l} value={v[f.k] || ''} onChange={e => setV({ ...v, [f.k]: e.target.value })} />
      : f.t === 'mood' ? <select key={f.k} className="inp" value={v[f.k] || ''} onChange={e => setV({ ...v, [f.k]: e.target.value })}><option value="">{f.l}</option>{['😞', '😕', '😐', '🙂', '😍'].map((m, i) => <option key={m} value={m}>{m} {i + 1}</option>)}</select>
      : <input key={f.k} className="inp" type={f.t === 'date' ? 'date' : 'text'} placeholder={f.l} value={v[f.k] || ''} onChange={e => setV({ ...v, [f.k]: e.target.value })} />)}
    {seal && <div className="text-xs mb-2"><label className="block mb-1">Seal until <input type="datetime-local" className="inp" value={until} onChange={e => setUntil(e.target.value)} /></label>
      <label><input type="checkbox" checked={both} onChange={e => setBoth(e.target.checked)} /> Needs both of us to open</label></div>}
    <button className="btn" onClick={add}>Add</button>
    <ul className="mt-3 space-y-2">{items.map(i => <li key={i.id} className="text-sm border-t border-rose-50 pt-2">
      {i.locked ? <span>🔒 {i.sealed_until && new Date(i.sealed_until) > new Date() ? 'Sealed until ' + new Date(i.sealed_until).toLocaleString() : i.iOpened ? 'Waiting for your partner…' : 'Needs both of you'}
        {i.needs_both && !i.iOpened && <button className="ml-2 underline" onClick={() => patch(i.id)}>I agree to open</button>}</span>
        : <div className="flex gap-2">{toggle && <button onClick={() => patch(i.id, 'toggle')}>{i.payload.done ? '✅' : '⬜'}</button>}
          <div className={i.payload.done ? 'line-through text-gray-400' : ''}>
            {fields.map(f => i.payload[f.k] ? (f.k === 'song' ? <a key={f.k} className="underline block text-rose-500" href={i.payload[f.k]} target="_blank">🎵 song</a> : <span key={f.k} className="mr-2">{i.payload[f.k]}</span>) : null)}
            {extra && <div className="text-xs text-rose-400">{extra(i.payload)}</div>}</div></div>}
      <div className="text-[10px] text-gray-400">{i.mine ? 'you' : 'partner'} · {new Date(i.created_at || Date.now()).toLocaleDateString()}</div></li>)}</ul>
    {after?.(items)}
  </section>;
}
function Trend({ items }: { items: any[] }) {
  const m = ['😞', '😕', '😐', '🙂', '😍'];
  const pts = items.filter(i => !i.locked && i.payload.mood).slice(0, 8).reverse();
  if (pts.length < 2) return null;
  return <div className="mt-3"><p className="text-xs text-rose-500 mb-1">Mood trend (oldest → newest)</p>
    <div className="flex items-end gap-1 h-16">{pts.map(i => { const n = m.indexOf(i.payload.mood) + 1; return <div key={i.id} className="flex-1 text-center"><div className="bg-rose-300 rounded" style={{ height: n * 10 }} /><span className="text-xs">{i.payload.mood}</span></div>; })}</div></div>;
}
function Themes({ items }: { items: any[] }) {
  const c: Record<string, number> = {};
  items.filter(i => !i.locked).forEach(i => (i.payload.text || '').toLowerCase().match(/[a-z']{4,}/g)?.forEach((w: string) => !STOP.has(w) && (c[w] = (c[w] || 0) + 1)));
  const top = Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 6);
  return top.length ? <p className="text-xs mt-3 text-rose-500">Recurring themes: {top.map(([w, n]) => `${w} (${n})`).join(', ')}</p> : null;
}
function Quiz() {
  const P = [['Words', 'Time'], ['Gifts', 'Service'], ['Touch', 'Words'], ['Time', 'Gifts'], ['Service', 'Touch'], ['Words', 'Gifts'], ['Time', 'Touch'], ['Service', 'Words']];
  const [i, setI] = useState(0); const [s, setS] = useState<Record<string, number>>({}); const [res, setRes] = useState('');
  const pick = async (l: string) => {
    const n = { ...s, [l]: (s[l] || 0) + 1 }; setS(n);
    if (i + 1 < P.length) return setI(i + 1);
    const top = Object.entries(n).sort((a, b) => b[1] - a[1])[0][0]; setRes(top);
    await api('/api/items', { b: { kind: 'lovelang', payload: { lang: top } } });
  };
  return <div className="card"><h2 className="font-semibold mb-2">Love language quiz</h2>
    {res ? <p>Your language: <b>{res}</b> 💗 Your partner now gets a daily action for it.</p>
      : <><p className="text-xs mb-2">{i + 1}/{P.length} · Which means more to you?</p>{P[i].map(l => <button key={l} className="btn w-full mb-2" onClick={() => pick(l)}>{LDESC[l]}</button>)}</>}</div>;
}
function Micro() {
  const [l, setL] = useState<string | null>(null);
  useEffect(() => { api('/api/items?kind=lovelang').then(r => { const p = (r.items || []).find((i: any) => !i.mine && !i.locked); setL(p?.payload?.lang || null); }); }, []);
  return <div className="card bg-rose-100"><p className="text-xs">Today's micro-action</p><p className="font-medium">{l ? LANGS[l] : 'Once your partner takes the quiz below, you will see an action for them here.'}</p></div>;
}
function Login({ onIn }: { onIn: () => void }) {
  const [m, setM] = useState<'login' | 'create'>('login'); const [f, setF] = useState<any>({}); const [err, setErr] = useState('');
  const go = async () => { const r = await api('/api/auth', { b: { action: m, ...f } }); r.error ? setErr(r.error) : onIn(); };
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  return <div className="pt-16"><h1 className="text-3xl font-bold text-center mb-6">💞 Us</h1><div className="card">
    <input className="inp" placeholder="Couple code" onChange={set('code')} /><input className="inp" placeholder="Your name" onChange={set('name')} />
    <input className="inp" type="password" inputMode="numeric" maxLength={4} placeholder="4-digit PIN" onChange={set('pin')} />
    {m === 'create' && <input className="inp" type="password" inputMode="numeric" maxLength={4} placeholder="Panic PIN (opens a decoy view)" onChange={set('panic')} />}
    {err && <p className="text-xs text-red-500 mb-2">{err}</p>}
    <button className="btn w-full" onClick={go}>{m === 'login' ? 'Enter' : 'Create / join'}</button>
    <button className="text-xs underline mt-3 w-full" onClick={() => setM(m === 'login' ? 'create' : 'login')}>{m === 'login' ? 'First time? Create or join' : 'I already have an account'}</button></div></div>;
}
export default function Home() {
  const [auth, setAuth] = useState<boolean | null>(null); const [tab, setTab] = useState(0);
  useEffect(() => { api('/api/auth').then(r => setAuth(r.in)); }, []);
  if (auth === null) return null;
  if (!auth) return <Login onIn={() => setAuth(true)} />;
  const logout = async () => { await api('/api/auth', { b: { action: 'logout' } }); setTab(0); setAuth(false); };
  const tabs = ['Today', 'Us', 'Memory', 'Away'];
  return <>
    <div className="flex justify-between items-center mb-4">
      <h1 className="font-bold text-lg">💞 Us</h1>
      <button className="text-xs border border-rose-300 text-rose-500 rounded-full px-3 py-1" onClick={logout}>Log out</button>
    </div>
    {tab === 0 && <><Micro /><Quiz />
      <Section kind="date" title="Important dates" hint="Anniversaries, birthdays, first-times" fields={[{ k: 'title', l: 'What', t: 'text' }, { k: 'date', l: '', t: 'date' }]} extra={p => (p.date ? daysTo(p.date) : '')} /></>}
    {tab === 1 && <><Section kind="checkin" title="Weekly check-in" hint="How was our week?" fields={[{ k: 'mood', l: 'Mood', t: 'mood' }, { k: 'text', l: 'One thing I appreciated / need', t: 'area' }]} after={its => <Trend items={its} />} />
      <Section kind="promise" title="Promise ledger" hint="Tap the box when kept" toggle fields={[{ k: 'text', l: 'I promise…', t: 'text' }]} /></>}
    {tab === 2 && <><Section kind="story" title="Our story" seal fields={[{ k: 'title', l: 'Moment', t: 'text' }, { k: 'when', l: '', t: 'date' }, { k: 'song', l: 'Song link (Spotify/YouTube)', t: 'url' }, { k: 'text', l: 'What happened', t: 'area' }]} />
      <Section kind="letter" title="Letters to the future" seal fields={[{ k: 'text', l: 'Dear us…', t: 'area' }]} /></>}
    {tab === 3 && <><Section kind="distance" title="Long-distance mode" hint="Timezone like Africa/Nairobi or Europe/London, plus your next visit" fields={[{ k: 'tz', l: 'My timezone', t: 'text' }, { k: 'visit', l: '', t: 'date' }]} extra={p => [p.tz && clock(p.tz), p.visit && 'visit ' + daysTo(p.visit)].filter(Boolean).join(' · ')} />
      <Section kind="sync" title="Sync moments" hint="Do the same thing at the same time: tea, a song, stargazing." fields={[{ k: 'text', l: "Let's both… at 9pm", t: 'text' }]} />
      <Section kind="dream" title="Dream journal" seal fields={[{ k: 'text', l: 'Last night I dreamed…', t: 'area' }]} after={its => <Themes items={its} />} /></>}
    <nav className="fixed bottom-0 inset-x-0 max-w-md mx-auto bg-white border-t border-rose-100 flex">
      {tabs.map((t, i) => <button key={t} onClick={() => setTab(i)} className={'flex-1 py-4 text-sm ' + (tab === i ? 'text-rose-500 font-semibold' : 'text-gray-400')}>{t}</button>)}</nav>
  </>;
}