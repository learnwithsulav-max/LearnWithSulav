# LearnWithSulav platform

One Next.js app, four portals, one brand. `middleware.ts` maps the host name to a portal:

| Address | Portal | Folder |
|---|---|---|
| sulavs.com.np | Landing page | `app/sites/root` |
| agency.sulavs.com.np | Agent dashboard | `app/sites/agency` |
| exam.sulavs.com.np | Practice exam | `app/sites/exam` |
| admin.sulavs.com.np | Master admin | `app/sites/admin` |

## Setup (about 20 minutes)

1. **Supabase**: create a free project. SQL Editor > paste `supabase/schema.sql` > Run.
   Authentication > Providers > Email: turn off "Confirm email" so agents can log in right after registering.
2. **Question bank**: in Google Sheets, File > Download > CSV. Save it as `data/NIA_Question_Bank.csv`, then run
   `npm install` and `npm run import:questions`. This replaces the 10 sample questions in `data/questions.json`.
3. **Environment**: copy `.env.example` to `.env.local` and fill the three Supabase values
   (Project Settings > API). The service role key stays server side.
4. **Run locally**: `npm run dev`, then open `localhost:3000` (landing), `exam.localhost:3000`,
   `agency.localhost:3000`, `admin.localhost:3000`. Set `NEXT_PUBLIC_ROOT_DOMAIN=localhost:3000` for local links.
5. **Deploy**: push to GitHub, import into Vercel, add the same env variables (with `NEXT_PUBLIC_ROOT_DOMAIN=sulavs.com.np`).
   In Vercel > Domains add `sulavs.com.np`, `www`, `agency`, `exam` and `admin`.
6. **Cloudflare**: your CNAME records already point to Vercel. If a page shows a redirect loop, set the records to
   "DNS only" (grey cloud) or set SSL/TLS mode to Full (strict).
7. **First admin**: register once at agency.sulavs.com.np, then run in the SQL Editor:
   `update profiles set role = 'admin', membership = 'premium' where email = 'learnwithsulav@gmail.com';`

## Things to adjust

- `lib/brand.ts`: exam length, pass percentage, links, contact details.
- `lib/rules.ts`: plan descriptions, weighted premium table, TDI/BDI layer rates.
- `public/certificate-template.jpg`: certificate artwork. Field positions are in `components/exam/certificate.ts`.
- Premium access: Admin > Agents > Membership. Free members get Leads and Plans; premium adds TDI/BDI and Monthly scheme.
