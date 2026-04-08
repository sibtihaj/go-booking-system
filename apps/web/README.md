# Web app

This package is the public-facing **Next.js** application for the booking system. It sits alongside the Go API in the monorepo and is the surface users interact with: sign-in, browsing availability, and creating reservations through the backend.

## Stack and structure

The app uses the **App Router** (Next.js 16) with **React 19**. Styling is **Tailwind CSS** with **Base UI** and **shadcn**-style components for accessible, composable UI. **Supabase** is integrated via `@supabase/supabase-js` and `@supabase/ssr` for session handling on both server and client. **Framer Motion** and **Mermaid** support richer UI and diagrams where the product calls for them.

Typography uses **next/font** with **Geist**, which keeps font loading optimized and consistent with current Next.js defaults.

## How it connects to the rest of the system

The browser talks to **Supabase** for auth and any direct client-side data access that the architecture allows. Business logic that needs the database with elevated privileges or custom rules goes through the **Go API**, configured via `NEXT_PUBLIC_API_URL`. That separation keeps secrets on the server and lets the API enforce booking rules and concurrency behaviour described elsewhere in the repository.

## Scripts

The `package.json` scripts follow usual Next.js conventions (`dev`, `build`, `start`, `lint`). There is also an `**api`** script that starts the Go server from the sibling `apps/api` folder, which is convenient when both halves of the stack are developed from this tree.

This README is intentionally descriptive: it explains what was built and how the pieces relate. For environment variable names and deployment topology, see the root `**DEPLOY.md`** and the `**.env.example**` files in `apps/web` and `apps/api`.