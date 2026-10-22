# Quick Release — Serverless Cloudflare Edge Architecture & Compact Bento UI

Transition the application to a 100% serverless, edge-native architecture powered by Cloudflare Pages Functions and Cloudflare R2 object storage, completely eliminating all Firebase and Supabase dependencies. Concurrently overhaul the user interface into a compact, zero-overflow Bento grid adhering strictly to the production frontend design constitution.

***

### User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions were selected and confirmed during Phase 1:

- **Confirmed Decision 1 (Storage & Persistence)**: Cloudflare R2 object storage with client-side cache replaces both Firebase Firestore and Supabase. Eliminates heavy external SDKs in favor of lightweight fetch calls and S3-compatible R2 storage.
- **Confirmed Decision 2 (UI & Aesthetic Style)**: Compact Bento grid with single-screen zero-overflow layout, featuring clean unboxed typography, hairline borders (`border-stone-200/80`), and strict 3-zone top bar contract.
- **Confirmed Decision 3 (Support Channel)**: Cloudflare Edge Worker API (`/api/support`) generates client ticket receipts and logs inquiries strictly directed to `duplexinterface@outlook.com`.

***

## 1. Overview & Core Concept

**Quick Release** is a sovereign, high-speed utility platform providing:
1. **Universal Vector QR Studio**: 10 standards (URL, Wi-Fi, vCard 3.0, Plain Text, Email, Phone, SMS, Calendar, Geo, Crypto) rendered 100% client-side with multi-geometry dot controls, customizable corner eyes, and lossless export (SVG, PNG, Clipboard, Print).
2. **Cloudflare Edge Redirect Relay**: Sub-millisecond `/r/:slug` edge routing via Cloudflare Pages Functions with optional Privacy Shield interstitial preview and referrer striping.
3. **Universal Tracking & Route Tree Map**: Deep HTTP redirect tracer and privacy analyzer that isolates tracking tokens (UTMs, gclid, fbclid) with zero tracking of visitors.
4. **Edge Persistence & R2 Cloud Vault**: Cloudflare R2 object storage maintaining link registry backups, vector QR assets, telemetry inspection traces, and support inquiries.

***

## 2. User Experience & Visual Design

### The Compact Bento Design System
- **Viewport Presence**: Optimized for a 1440px desktop baseline with full responsiveness. Outer container bounded to max-w-7xl with single-elevation depth. No nested "cards inside cards" and zero horizontal or vertical window overflow.
- **Color Discipline (60-30-10)**:
  - **60% Canvas**: Warm porcelain neutral field (`#FAF8F5`).
  - **30% Structural Surfaces**: Crisp white Bento cards (`#FFFFFF`) framed with subtle hairline borders (`rgba(0,0,0,0.08)` / `border-stone-200/80`) and muted clay accents (`#FAF4F0`).
  - **10% High-Intent Accents**: Deep charcoal ink (`#1A1C1A`) for primary actions, QR matrix elements, and crisp typography; soft sage accents (`#EBF1ED` / `#2C3830`) for verified states.
- **Top Navigation Bar Contract**:
  - Exactly three zones:
    $$\text{[Quick Release wordmark]} \quad\text{—}\quad \text{[Home · QR Studio · Short Links · Tree Map · About · Privacy]} \quad\text{—}\quad \text{[+ Create Link button]}$$
  - No decorative status dots, no pulsing badges, and no secondary taglines.
- **Zero-Pill Metadata**:
  - Metadata rendered as clean, unboxed text separated by typographic separators (`·` or `/`). No pill capsules or badge sandwiches on cards.
- **Tabular Figures**:
  - All metrics, click counters, hop counts, and timestamps use `font-mono tabular-nums`.

***

## 3. Key Product Decisions & Trade-Offs

- **Total Removal of Firebase & Supabase**:
  - *Chosen Approach*: Completely uninstall `@supabase/supabase-js` and `firebase` client SDKs. Remove `firebase-blueprint.json`, `firestore.rules`, and related boilerplates.
  - *Why*: Eliminates bundle overhead, eliminates third-party credentials, and standardizes the entire runtime on Cloudflare edge functions.
- **Cloudflare R2 Object Storage**:
  - *Chosen Approach*: Store link records in R2 (`links/registry.json` and `links/:slug.json`), QR vector assets in `vault/:id.svg`, telemetry traces in `telemetry/:id.json`, and contact inquiries in `inquiries/:id.json`. For local development server (`server.ts`), provide seamless local file fallback synced with R2 S3 REST.
  - *Why*: Highly cost-effective (free tier covers 10M reads/month and 10GB storage), zero egress fees, global edge distribution.
- **Edge Routing Performance**:
  - *Chosen Approach*: Cloudflare Pages Function `/functions/r/[slug].ts` reads directly from edge R2 / memory cache and immediately returns an HTTP 302 redirect with `Referrer-Policy: no-referrer` in under 15ms globally.

***

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Quick Release Frontend (React SPA)                   │
│                                                                        │
│  ┌──────────────────────┐  ┌────────────────────────────────────────┐  │
│  │   Top Bar (3-Zone)   │  │ Compact Bento Grid (Single Viewport)   │  │
│  │  Quick Release · Nav │  │ - Tile 1: Universal QR Studio (Live)   │  │
│  └──────────────────────┘  │ - Tile 2: Visual Tree Map Preview      │  │
│                            │ - Tile 3: 1-Click Edge Shortener       │  │
│                            │ - Tile 4: Edge Routing Registry Table  │  │
│                            └────────────────────────────────────────┘  │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ Edge API & REST Requests
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│             Cloudflare Edge Functions & Dev Server Proxy               │
│                                                                        │
│  - /r/:slug & /s/:slug       Edge HTTP 302 Redirect Relay              │
│  - /api/links                Link Registry CRUD                        │
│  - /api/inspect-url          Universal Route & Tracking Inspector      │
│  - /api/qr-vault/save        R2 Vector QR Asset Vault Upload           │
│  - /api/support              Ticket Dispatcher -> duplexinterface...  │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ S3 REST / R2 Bucket Binding
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  Cloudflare R2 Serverless Object Store                 │
│                                                                        │
│  - quick-release-bucket / links/registry.json                          │
│  - quick-release-bucket / vault/{id}.svg                               │
│  - quick-release-bucket / telemetry/{id}.json                          │
│  - quick-release-bucket / inquiries/{id}.json                          │
└────────────────────────────────────────────────────────────────────────┘
```

### Component & File Refactoring Sequence
1. **Remove Firebase & Supabase SDKs**:
   - Uninstall `@supabase/supabase-js` and `firebase` packages from `package.json`.
   - Remove `src/services/firebase.ts` and `src/services/supabase.ts`.
   - Delete `firebase-blueprint.json` and `firestore.rules`.
2. **Implement Cloudflare Edge & R2 Service**:
   - Create `src/services/cloudflare.ts`: Typed client service communicating with Cloudflare Pages Functions and local dev server proxy routes (`/api/links`, `/api/inspect-url`, `/api/qr-vault`, `/api/support`).
   - Update `functions/r/[slug].ts`: Cloudflare Pages Edge function performing instant R2 / edge cache lookup for direct 302 routing.
   - Update `server.ts`: Modernized serverless-compatible Express dev server using Cloudflare R2 S3 API with local cache fallback.
3. **Redesign Frontend Components (Compact Bento Grid)**:
   - `src/components/Navbar.tsx`: Strict 3-zone contract, no badges or status pills.
   - `src/components/LandingPage.tsx`: Compact Bento hero with live vector canvas, single-elevation cards, zero overflow.
   - `src/components/QRStudio.tsx`: Streamlined controls, instant vector preview, R2 cloud vault export, default templates referencing `duplexinterface@outlook.com`.
   - `src/components/LinkRouter.tsx`: High-density routing registry table with tabular numbers, live shield toggle, and QR binding.
   - `src/components/UrlInspector.tsx`: Clean tree map hierarchy with preloaded profiles and zero prototype labels.
   - `src/components/StaticPages.tsx`: Polished About, Privacy, and Contact views with edge ticket dispatch to `duplexinterface@outlook.com`.
   - `src/components/CloudflareConsoleModal.tsx`: Lightweight Edge Cloud Console replacing the old dual-cloud modal, displaying Cloudflare R2 status, edge routing latency, and link counts.
4. **Verification**:
   - Compile applet (`compile_applet`) and run linter (`lint_applet`) to ensure 100% type safety and zero unused dependencies.
