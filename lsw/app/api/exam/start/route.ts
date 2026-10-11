import { NextResponse } from 'next/server';
import { QUESTIONS } from '@/lib/questions';
import { admin } from '@/lib/supabase-admin';
import { EXAM } from '@/lib/brand';

export const dynamic = 'force-dynamic';

function shuffle<T>(a: T[]) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim().slice(0, 80);
  const phone = String(body.phone || '').replace(/\D/g, '').slice(0, 15);
  if (name.length < 2 || phone.length < 7) return NextResponse.json({ error: 'Enter your full name and a valid phone number.' }, { status: 400 });

  const picked = shuffle(QUESTIONS).slice(0, EXAM.total);
  const now = Date.now();
  const endsAt = new Date(now + EXAM.minutes * 60000).toISOString();
  const { data, error } = await admin.from('exam_attempts')
    .insert({ name, phone, question_ids: picked.map((q) => q.id), ends_at: endsAt }).select('id').single();
  if (error || !data) return NextResponse.json({ error: 'Could not start the exam. Try again in a moment.' }, { status: 500 });

  // Options are shuffled per attempt, so the position of the right answer varies.
  const questions = picked.map((q) => ({ id: q.id, q: q.q, options: shuffle(q.options) }));
  return NextResponse.json({ attemptId: data.id, name, endsAt, serverNow: now, questions });
}
