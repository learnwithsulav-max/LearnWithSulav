'use client';
import { useEffect, type ReactNode } from 'react';
import { Logo } from './Logo';
import { cx } from './ui';
import { LangToggle, useI18n } from '@/lib/i18n';
import { siteUrl, type SiteKey } from '@/lib/brand';

const TITLES: Record<SiteKey, string> = { root: 'LearnWithSulav', agency: 'Agency Portal', exam: 'Exam Portal', admin: 'Admin' };
const NAV: [SiteKey, string][] = [['root', 'nav_home'], ['agency', 'nav_agency'], ['exam', 'nav_exam']];

// Same header, logo, colours and font on every portal.
export function Shell({ site, right, children }: { site: SiteKey; right?: ReactNode; children: ReactNode }) {
  const { t } = useI18n();
  useEffect(() => { document.title = site === 'root' ? 'LearnWithSulav' : `${TITLES[site]} | LearnWithSulav`; }, [site]);
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <a href={siteUrl('root')} aria-label="LearnWithSulav home"><Logo /></a>
          <nav className="hidden gap-1 md:flex" aria-label="Portals">
            {NAV.map(([k, l]) => (
              <a key={k} href={siteUrl(k)}
                className={cx('rounded-md px-3 py-2 text-sm font-medium', site === k ? 'bg-slate-100 text-navy' : 'text-slate-600 hover:text-navy')}>
                {t(l)}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3"><LangToggle />{right}</div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-slate-200 bg-white py-5 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} LearnWithSulav, Sulav Sapkota.{' '}
        <a className="underline" href={siteUrl('admin')}>Admin</a>
      </footer>
    </div>
  );
}
