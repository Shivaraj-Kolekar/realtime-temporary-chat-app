# Realtime Temporary Chat App

A minimal, privacy-first chat application that allows anyone to create short-lived, anonymous chat rooms. Rooms are assigned friendly anonymous names by the client and automatically expire after a configurable time — when the time limit is reached the room and its messages become inaccessible.

This repository contains a Next.js frontend + lightweight backend API (Elysia) and uses Upstash (Redis + Realtime) for ephemeral storage and realtime events. The app is optimized for fast deployment on Vercel.

- Live demo: https://realtime-temporary-chat-app.vercel.app/
- Author: Shivaraj-Kolekar

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [How it works (high level)](#how-it-works-high-level)
- [Local setup](#local-setup)
  - [Prerequisites](#prerequisites)
  - [Environment variables](#environment-variables)
  - [Install and run](#install-and-run)
- [Deployment (Vercel)](#deployment-vercel)
- [Developer notes & caveats](#developer-notes--caveats)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- Create ephemeral chat rooms with a single click
- Anonymous identity generation (client-side) — e.g. `anonyms-dog-abc12`
- Realtime messaging powered by Upstash Realtime
- Room metadata and messages stored in Upstash Redis (ephemeral TTL)
- Room expiry / self-destruct when TTL ends (users redirected if room expired)
- Small, serverless-first footprint (designed for Vercel + Upstash)

---

## Tech stack

- Framework: Next.js (App Router)
- Server API: Elysia (embedded API routes)
- Realtime: Upstash Realtime
- Database / storage: Upstash Redis
- Client state & caching: @tanstack/react-query
- Utilities: nanoid (anonymous id generation)
- Styling: Tailwind CSS and shadcn
- Language: TypeScript

Files and indicators:
- Next.js app at `src/app/*`
- API routes and Elysia app mounted in `src/app/api/[[...slugs]]/route.ts`
- Upstash Realtime route at `src/app/api/realtime/route.ts`
- Redis client: `src/lib/redis.ts`
- Client helper & realtime client: `src/lib/client.ts`, `src/lib/realtime-client.ts`
- Anonymous username hook: `src/hooks/useUsername.ts`

---

## How it works (high level)

1. When a user creates a room, the server stores room metadata and sets a TTL in Upstash Redis.
2. The client uses a generated anonymous identity (stored in localStorage).
3. Realtime events (messages, join/leave, destroy) are delivered via Upstash Realtime.
4. When the room TTL expires (or the room is destroyed manually), the Redis metadata disappears and requests to that room will redirect users to the home page with an error (room not found / destroyed).
5. The app uses a small middleware/proxy (see `src/proxy.ts`) to validate room IDs and redirect if needed.

---

## Local setup

### Prerequisites

- Node.js 18+ (recommended)
- npm / pnpm / yarn
- Upstash account (for Redis + Realtime)
- Optional: Vercel account for deployment

### Environment variables

Create a `.env.local` file at the project root. Required variables depend on how you configure Upstash and deployment. At minimum you will need:

- NEXT_PUBLIC_API_URL=http://localhost:3000/api
  - Used by the client treaty API helper to call the local API.
- UPSTASH_REDIS_REST_URL (or the REST URL shown by Upstash)
- UPSTASH_REDIS_REST_TOKEN (REST token for Upstash)
- UPSTASH_REALTIME_REST_URL / UPSTASH_REALTIME_REST_TOKEN (if using separate Realtime credentials — check your Upstash dashboard)
- Any Vercel-specific environment variables when deploying remotely (same names)

Note: The project uses `Redis.fromEnv()` and Upstash libraries that read connection values from environment variables. Check Upstash docs for exact variable names shown in your Upstash console — the app reads them at runtime.

Example `.env.local` (replace placeholders with actual values from Upstash/Vercel):
```
NEXT_PUBLIC_API_URL=http://localhost:3000/api
UPSTASH_REDIS_REST_URL=https://us1-XXXX.upstash.io
UPSTASH_REDIS_REST_TOKEN=put-your-upstash-rest-token-here
# If your Upstash Realtime instance provides a different set of credentials, add them here:
UPSTASH_REALTIME_REST_URL=https://realtime-XXXX.upstash.io
UPSTASH_REALTIME_REST_TOKEN=put-your-upstash-realtime-token-here
```

If you are unsure which exact names your code expects, inspect `src/lib/redis.ts` and any `lib/realtime` file. The project uses Upstash helpers like `Redis.fromEnv()` which will read the UPSTASH environment variables shown in Upstash docs.

### Install and run

1. Clone the repo
   ```
   git clone https://github.com/Shivaraj-Kolekar/realtime-temporary-chat-app.git
   cd realtime-temporary-chat-app
   ```

2. Install dependencies
   ```
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. Add `.env.local` (see above).

4. Run the dev server
   ```
   npm run dev
   # or yarn dev / pnpm dev
   ```

5. Open http://localhost:3000

Standard build/start:
```
npm run build
npm run start
```

---

## Deployment (Vercel)

This project is designed to be deployed on Vercel:

1. Push your repository to GitHub.
2. Import the repository into Vercel.
3. In the Vercel dashboard for the project, add the needed Environment Variables (same keys as in `.env.local`) — particularly the Upstash REST & Realtime credentials and `NEXT_PUBLIC_API_URL` (usually set to your Vercel app URL + `/api`).
4. Deploy. Vercel will run the Next.js build and host both frontend and API routes.

Notes:
- Upstash Realtime works well with serverless providers; ensure you've configured the correct Upstash Realtime URL / token.
- If using `NEXT_PUBLIC_API_URL` in production, make sure it points to your deployed site API (e.g. `https://your-app.vercel.app/api`).

---

## Developer notes & caveats

- Privacy-first: this app intentionally uses no user authentication — identities are anonymous and stored in localStorage only. Do not rely on this for security-sensitive use-cases.
- Persistence: messages and room metadata are stored in Redis with TTL. If you need long-term persistence, swap or augment Redis with a persistent store.
- Scalability: Upstash scales for serverless usage but you should review rate limits & plan for high traffic.
- Security: consider adding rate limiting, input sanitization, and moderation tools for public deployments.
- Hard-coded assumptions: room size limits, TTL default and exact env var names should be validated in the code before large-scale deployment.
- Tests: There are no automated tests included (add unit/e2e tests as needed).

---

## Troubleshooting

- "Room not found" on entering a room:
  - The room TTL may have expired or room wasn't created correctly. Check Redis data in Upstash console.
  - Make sure your `UPSTASH_*` environment variables are correct.

- Realtime connection issues:
  - Confirm Realtime credentials/URL are correct and accessible from your deployment environment.
  - Inspect browser console/network and Vercel server logs.

- API calls failing:
  - Ensure `NEXT_PUBLIC_API_URL` is set correctly in the environment for the client and in server environment if required.

If you want, I can add an .env.example file and/or a short diagram that explains the request flow and the redis key schema this app uses.

---

## Contributing

Contributions, issues, and feature requests are welcome. If you'd like to:
- Open an issue for bugs or feature requests
- Send a PR for improvements (e.g. tests, CI, better environment handling, moderation, or persistence options)

Please include a clear description of what you changed and why.

---

## License

Specify a license for the repo (e.g. MIT). If you want me to add a LICENSE file, tell me which license you prefer and I can create one.

---

If you'd like, I can:
- Add an `.env.example` to the repo with the exact keys extracted from the code,
- Create a short architecture diagram,
- Or open a PR that replaces the current README with this version. Let me know which you prefer.