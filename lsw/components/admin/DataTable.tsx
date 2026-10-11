'use client';
import { exportCsv } from '@/lib/csv';
import { Btn, Card } from '../ui';

export type Col = { k: string; h: string; render?: (r: any) => any; csv?: (r: any) => any };

export function DataTable({ cols, rows, name, empty = 'No records yet.' }: { cols: Col[]; rows: any[]; name: string; empty?: string }) {
  return (
    <Card className="overflow-hidden">
      <div className="no-print flex justify-end gap-2 border-b border-slate-100 p-3">
        <Btn variant="ghost" onClick={() => exportCsv(name, cols.map((c) => c.h), rows.map((r) => cols.map((c) => (c.csv ? c.csv(r) : r[c.k]))))}>Export CSV (Excel)</Btn>
        <Btn variant="ghost" onClick={() => window.print()}>Print / Save PDF</Btn>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600"><tr>{cols.map((c) => <th key={c.k} className="px-3 py-2 font-semibold">{c.h}</th>)}</tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id || i} className="border-t border-slate-100">{cols.map((c) => <td key={c.k} className="px-3 py-2">{c.render ? c.render(r) : r[c.k] ?? '-'}</td>)}</tr>
            ))}
            {!rows.length && <tr><td colSpan={cols.length} className="px-3 py-8 text-center text-slate-500">{empty}</td></tr>}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
