'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { PLANS, calcIncentive, layersOf, monthEnd, monthStart, npr, planName, today, weightPct, weighted } from '@/lib/rules';
import { STAGES } from '../agency/Kanban';
import { schemeTone } from '../agency/Schemes';
import { AuthCard } from '../AuthCard';
import { Shell } from '../Shell';
import { Badge, Btn, Card, Field, cx } from '../ui';
import { DataTable } from './DataTable';

const TABLES = ['profiles', 'exam_attempts', 'leads', 'policies', 'schemes', 'scheme_status', 'activity_log'];
const TABS = ['Overview', 'Agents', 'Exams', 'Leads', 'Finance', 'Schemes', 'Logs'];

export default function AdminApp() {
  const { session, profile, loading, signOut } = useAuth();
  const out = <Btn variant="ghost" onClick={signOut}>Log out</Btn>;
  if (loading) return <Shell site="admin"><p className="p-10 text-center text-slate-500">Loading...</p></Shell>;
  if (!session) return <Shell site="admin"><AuthCard title="Master admin" allowRegister={false} /></Shell>;
  if (profile?.role !== 'admin') return <Shell site="admin" right={out}><Card className="mx-auto my-16 max-w-md p-8 text-center"><h1 className="text-xl font-bold">Access restricted</h1><p className="mt-2 text-slate-600">This portal is for the master admin only.</p></Card></Shell>;
  return <Shell site="admin" right={out}><Dashboard /></Shell>;
}

function Dashboard() {
  const [tab, setTab] = useState('Overview');
  const [d, setD] = useState<Record<string, any[]>>({});
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(monthEnd());

  const load = useCallback(async () => {
    const res = await Promise.all(TABLES.map((t) =>
      supabase.from(t).select('*').order('created_at' as any, { ascending: false }).limit(t === 'activity_log' ? 300 : 2000)));
    setD(Object.fromEntries(TABLES.map((t, i) => [t, res[i].data || []])));
  }, []);

  // Real-time: any change in these tables refreshes the dashboard.
  useEffect(() => {
    load();
    const ch = supabase.channel('admin-live');
    TABLES.forEach((t) => ch.on('postgres_changes', { event: '*', schema: 'public', table: t }, () => load()));
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const P = d.profiles || [], A = d.exam_attempts || [], L = d.leads || [], POL = d.policies || [];
  const name = useMemo(() => Object.fromEntries(P.map((p) => [p.id, p.name || p.email])), [P]);
  const done = A.filter((a) => a.submitted_at);
  const passRate = done.length ? Math.round((done.filter((a) => a.passed).length / done.length) * 100) : 0;
  const inRange = POL.filter((p) => p.issue_date >= from && p.issue_date <= to);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="no-print mb-6 flex flex-wrap gap-2" role="tablist">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={cx('rounded-lg px-4 py-2 text-sm font-semibold', tab === t ? 'bg-navy text-white' : 'bg-white text-slate-700 hover:bg-slate-100')}>{t}</button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="grid gap-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              ['Agents', P.filter((p) => p.role === 'agent').length], ['Premium members', P.filter((p) => p.membership === 'premium').length],
              ['Exam attempts', A.length], ['Exam pass rate', `${passRate}%`],
              ['Leads', L.length], ['Closed won', L.filter((l) => l.stage === 'Closed Won').length],
              ['Premium collected', npr(POL.reduce((s, p) => s + Number(p.premium || 0), 0))], ['Weighted premium', npr(POL.reduce((s, p) => s + weighted(p), 0))],
            ].map(([k, v]) => <Card key={String(k)} className="p-4"><p className="text-sm text-slate-500">{k}</p><p className="mt-1 text-2xl font-extrabold">{v}</p></Card>)}
          </div>
          <div>
            <h2 className="mb-3 font-bold">Latest exam results</h2>
            <DataTable name="latest-exams" rows={A.slice(0, 8)} cols={examCols} />
          </div>
        </div>
      )}

      {tab === 'Agents' && (
        <DataTable name="agents" rows={P} cols={[
          { k: 'name', h: 'Name' }, { k: 'phone', h: 'Phone' }, { k: 'license_no', h: 'License' }, { k: 'branch', h: 'Branch' },
          { k: 'referral_code', h: 'Referral code' }, { k: 'upline', h: 'Upline', render: (r) => name[r.upline_id] || '-', csv: (r) => name[r.upline_id] || '' },
          { k: 'membership', h: 'Membership', render: (r) => <Sel v={r.membership} opts={['free', 'premium']} on={(v) => supabase.from('profiles').update({ membership: v }).eq('id', r.id).then(load)} /> },
          { k: 'status', h: 'Status', render: (r) => <Sel v={r.status} opts={['active', 'suspended']} on={(v) => supabase.from('profiles').update({ status: v }).eq('id', r.id).then(load)} /> },
          { k: 'created_at', h: 'Joined', render: (r) => r.created_at?.slice(0, 10) },
        ]} />
      )}

      {tab === 'Exams' && <DataTable name="exam-results" rows={A} cols={examCols} />}

      {tab === 'Leads' && (
        <div className="grid auto-cols-[260px] grid-flow-col gap-4 overflow-x-auto pb-4">
          {STAGES.map((s) => {
            const col = L.filter((l) => l.stage === s);
            return (
              <section key={s} className="rounded-xl bg-slate-100 p-3">
                <h3 className="mb-1 flex items-center justify-between text-sm font-bold">{s}<Badge tone="blue">{col.length}</Badge></h3>
                <p className="mb-3 text-xs text-slate-500">{npr(col.reduce((t, l) => t + Number(l.est_premium || 0), 0))}</p>
                <div className="grid gap-2">
                  {col.slice(0, 40).map((l) => (
                    <Card key={l.id} className="p-3 text-sm"><p className="font-semibold">{l.name}</p><p className="text-slate-500">{name[l.agent_id]}</p>
                      {l.follow_up_date && <p className="text-xs text-slate-500">Follow-up {l.follow_up_date}</p>}</Card>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {tab === 'Finance' && <Finance P={P} POL={POL} inRange={inRange} name={name} from={from} to={to} setFrom={setFrom} setTo={setTo} reload={load} />}
      {tab === 'Schemes' && <Schemes P={P.filter((p) => p.role === 'agent')} schemes={d.schemes || []} status={d.scheme_status || []} reload={load} />}
      {tab === 'Logs' && <DataTable name="activity-log" rows={d.activity_log || []} cols={[
        { k: 'created_at', h: 'Time', render: (r) => new Date(r.created_at).toLocaleString() }, { k: 'actor', h: 'Who' }, { k: 'action', h: 'Action' },
        { k: 'meta', h: 'Details', render: (r) => JSON.stringify(r.meta || {}) },
      ]} />}
    </div>
  );
}

const examCols = [
  { k: 'name', h: 'Name' }, { k: 'phone', h: 'Phone' },
  { k: 'score', h: 'Marks', render: (r: any) => (r.submitted_at ? `${r.score}/${r.max_marks}` : 'In progress'), csv: (r: any) => (r.submitted_at ? r.score : '') },
  { k: 'passed', h: 'Result', render: (r: any) => (r.submitted_at ? <Badge tone={r.passed ? 'green' : 'red'}>{r.passed ? 'Pass' : 'Fail'}</Badge> : '-'), csv: (r: any) => (r.submitted_at ? (r.passed ? 'Pass' : 'Fail') : '') },
  { k: 'cert_id', h: 'Certificate' }, { k: 'created_at', h: 'Started', render: (r: any) => new Date(r.created_at).toLocaleString() },
];

function Sel({ v, opts, on }: { v: string; opts: string[]; on: (v: string) => void }) {
  return <select value={v} onChange={(e) => on(e.target.value)} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm">{opts.map((o) => <option key={o}>{o}</option>)}</select>;
}

function Finance({ P, POL, inRange, name, from, to, setFrom, setTo, reload }: any) {
  const [f, setF] = useState<any>({ plan_type: 'endowment', premium_mode: 'regular', term_years: 15, issue_date: today() });
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  const agents = P.filter((p: any) => p.role === 'agent');

  const rows = agents.map((a: any) => {
    const L = layersOf(a.id, P);
    const prod = (['A', 'B', 'C', 'D'] as const).flatMap((l) => inRange.filter((p: any) => L[l].includes(p.agent_id)).map((p: any) => ({ ...p, layer: l })));
    const tdi = calcIncentive(prod, 'TDI'), bdi = calcIncentive(prod, 'BDI');
    const self = inRange.filter((p: any) => p.agent_id === a.id);
    return { id: a.id, name: a.name, count: self.length, premium: self.reduce((s: number, p: any) => s + Number(p.premium), 0), weighted: self.reduce((s: number, p: any) => s + weighted(p), 0), tdi: tdi.totalCredit, bdi: bdi.totalCredit };
  });

  async function add(e: any) {
    e.preventDefault();
    await supabase.from('policies').insert({ ...f, term_years: Number(f.term_years), premium: Number(f.premium), sum_assured: f.sum_assured ? Number(f.sum_assured) : null, next_due_date: f.next_due_date || null });
    setF({ ...f, client_name: '', premium: '' }); reload();
  }

  return (
    <div className="grid gap-8">
      <Card className="no-print flex flex-wrap items-end gap-3 p-4">
        <Field label="From" type="date" value={from} onChange={(e: any) => setFrom(e.target.value)} />
        <Field label="To" type="date" value={to} onChange={(e: any) => setTo(e.target.value)} />
      </Card>
      <div>
        <h2 className="mb-3 font-bold">Agent performance and incentive credit</h2>
        <DataTable name="agent-performance" rows={rows} cols={[
          { k: 'name', h: 'Agent' }, { k: 'count', h: 'Policies' },
          { k: 'premium', h: 'Premium', render: (r: any) => npr(r.premium), csv: (r: any) => r.premium },
          { k: 'weighted', h: 'Weighted', render: (r: any) => npr(r.weighted), csv: (r: any) => r.weighted },
          { k: 'tdi', h: 'TDI credit', render: (r: any) => npr(r.tdi), csv: (r: any) => r.tdi },
          { k: 'bdi', h: 'BDI credit', render: (r: any) => npr(r.bdi), csv: (r: any) => r.bdi },
        ]} />
      </div>
      <form onSubmit={add} className="no-print grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-4">
        <h2 className="font-bold sm:col-span-4">Record a policy for an agent</h2>
        <Field label="Agent" as="select" required value={f.agent_id || ''} onChange={set('agent_id')}><option value="">Choose</option>{agents.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}</Field>
        <Field label="Client" required value={f.client_name || ''} onChange={set('client_name')} />
        <Field label="Plan" as="select" value={f.plan_type} onChange={set('plan_type')}>{PLANS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Field>
        <Field label="Mode" as="select" value={f.premium_mode} onChange={set('premium_mode')}><option value="regular">Regular</option><option value="single">Single</option></Field>
        <Field label="Term (years)" type="number" min="1" value={f.term_years} onChange={set('term_years')} />
        <Field label="Premium (NPR)" type="number" required value={f.premium || ''} onChange={set('premium')} />
        <Field label="Issue date" type="date" required value={f.issue_date} onChange={set('issue_date')} />
        <Btn type="submit" className="self-end">Add policy</Btn>
      </form>
      <div>
        <h2 className="mb-3 font-bold">Policy ledger</h2>
        <DataTable name="policies" rows={inRange} cols={[
          { k: 'issue_date', h: 'Issued' }, { k: 'agent', h: 'Agent', render: (r: any) => name[r.agent_id], csv: (r: any) => name[r.agent_id] },
          { k: 'client_name', h: 'Client' }, { k: 'plan', h: 'Plan', render: (r: any) => planName(r.plan_type), csv: (r: any) => planName(r.plan_type) },
          { k: 'premium_mode', h: 'Mode' }, { k: 'term_years', h: 'Term' },
          { k: 'premium', h: 'Premium', render: (r: any) => npr(r.premium), csv: (r: any) => r.premium },
          { k: 'count', h: 'Counts', render: (r: any) => `${weightPct(r.premium_mode, r.term_years) * 100}%`, csv: (r: any) => weightPct(r.premium_mode, r.term_years) * 100 },
        ]} />
      </div>
    </div>
  );
}

function Schemes({ P, schemes, status, reload }: any) {
  const [n, setN] = useState<any>({});
  const [sel, setSel] = useState('');
  const [edits, setEdits] = useState<Record<string, any>>({});
  const cur = schemes.find((s: any) => s.id === sel);
  const statusOf = (aid: string) => ({ ...(status.find((x: any) => x.scheme_id === sel && x.agent_id === aid) || { achieved: 0, status: 'pending', note: '' }), ...(edits[aid] || {}) });

  async function create(e: any) {
    e.preventDefault();
    await supabase.from('schemes').insert({ title: n.title, month_label: n.month_label, target: Number(n.target || 0), criteria: n.criteria, active: true });
    setN({}); reload();
  }
  async function saveRow(aid: string) {
    const s = statusOf(aid);
    await supabase.from('scheme_status').upsert({ scheme_id: sel, agent_id: aid, achieved: Number(s.achieved || 0), status: s.status, note: s.note || null }, { onConflict: 'scheme_id,agent_id' });
    setEdits({ ...edits, [aid]: undefined }); reload();
  }
  const upd = (aid: string, k: string, v: any) => setEdits({ ...edits, [aid]: { ...(edits[aid] || {}), [k]: v } });

  return (
    <div className="grid gap-6">
      <form onSubmit={create} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-4">
        <h2 className="font-bold sm:col-span-4">New monthly scheme</h2>
        <Field label="Title" required value={n.title || ''} onChange={(e: any) => setN({ ...n, title: e.target.value })} />
        <Field label="Month" placeholder="Kartik 2083" value={n.month_label || ''} onChange={(e: any) => setN({ ...n, month_label: e.target.value })} />
        <Field label="Target (NPR)" type="number" value={n.target || ''} onChange={(e: any) => setN({ ...n, target: e.target.value })} />
        <Field label="Criteria" value={n.criteria || ''} onChange={(e: any) => setN({ ...n, criteria: e.target.value })} />
        <Btn type="submit">Create scheme</Btn>
      </form>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Update qualification for" as="select" value={sel} onChange={(e: any) => { setSel(e.target.value); setEdits({}); }}>
          <option value="">Choose a scheme</option>{schemes.map((s: any) => <option key={s.id} value={s.id}>{s.title} ({s.month_label})</option>)}
        </Field>
        {cur && <Btn variant="ghost" onClick={async () => { await supabase.from('schemes').update({ active: !cur.active }).eq('id', cur.id); reload(); }}>{cur.active ? 'Hide from agents' : 'Show to agents'}</Btn>}
      </div>
      {cur && (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600"><tr><th className="px-3 py-2">Agent</th><th>Achieved (NPR)</th><th>Status</th><th>Note</th><th /></tr></thead>
            <tbody>
              {P.map((a: any) => { const s = statusOf(a.id); return (
                <tr key={a.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium">{a.name}</td>
                  <td><input type="number" value={s.achieved} onChange={(e) => upd(a.id, 'achieved', e.target.value)} className="w-32 rounded-md border border-slate-300 px-2 py-1" /></td>
                  <td><Sel v={s.status} opts={['pending', 'qualified', 'not_qualified']} on={(v) => upd(a.id, 'status', v)} /> <Badge tone={schemeTone[s.status]}>{s.status.replace('_', ' ')}</Badge></td>
                  <td><input value={s.note || ''} onChange={(e) => upd(a.id, 'note', e.target.value)} className="w-56 rounded-md border border-slate-300 px-2 py-1" /></td>
                  <td className="px-3"><Btn variant="dark" onClick={() => saveRow(a.id)}>Save</Btn></td>
                </tr>); })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
