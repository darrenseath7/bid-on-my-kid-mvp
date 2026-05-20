# Bid On My Kid MVP

Mobile-first web app prototype for live school art auctions.

## Stack

- Next.js
- Tailwind CSS
- Supabase
- OpenAI API
- Vercel

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Supabase setup

1. Create a Supabase project.
2. Open Supabase SQL editor.
3. Run `supabase/schema.sql`.
4. Copy project URL and anon key into `.env.local`.
5. Enable Realtime for `auctions`, `artworks`, `bids`, and `auction_events`.

## Demo routes

- `/` landing page
- `/admin` school admin dashboard shell
- `/admin/auctions/new` create auction shell
- `/admin/auctions/demo/control` admin control room mock
- `/auction/demo` parent mobile auction mock

## Next build tasks

1. Replace mock state with Supabase data.
2. Create real auction/artwork upload flow.
3. Add Supabase Storage for artwork images.
4. Add server-side bid validation.
5. Add certificate/invoice generation.
6. Add AI image enhancement/framing.
