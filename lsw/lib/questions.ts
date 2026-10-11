import 'server-only';
import raw from '@/data/questions.json';

// data/questions.json is built by `npm run import:questions`. It is only imported
// on the server, so correct answers never reach the browser.
export type Q = { id: number; q: string; options: { k: string; text: string }[]; ans: string };

export const QUESTIONS: Q[] = (raw as any[]).map((r) => ({
  id: r.id, q: r.q, ans: r.ans,
  options: [{ k: 'A', text: r.a }, { k: 'B', text: r.b }, { k: 'C', text: r.c }, { k: 'D', text: r.d }],
}));
