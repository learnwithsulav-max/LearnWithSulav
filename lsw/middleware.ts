import { NextResponse, type NextRequest } from 'next/server';

// Multi-domain routing: one Next.js app serves four portals.
//   sulavs.com.np         -> /sites/root
//   agency.sulavs.com.np  -> /sites/agency
//   exam.sulavs.com.np    -> /sites/exam
//   admin.sulavs.com.np   -> /sites/admin
// Preview/dev override: add ?site=exam (also works on *.vercel.app).
const SITES = ['agency', 'exam', 'admin'];

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  if (url.pathname.startsWith('/sites')) return NextResponse.redirect(new URL('/', req.url));

  const host = (req.headers.get('host') || '').split(':')[0];
  let site = url.searchParams.get('site') || host.split('.')[0];
  if (!SITES.includes(site)) site = 'root';

  url.pathname = `/sites/${site}${url.pathname === '/' ? '' : url.pathname}`;
  return NextResponse.rewrite(url);
}

export const config = { matcher: ['/((?!api|_next|.*\\..*).*)'] };
