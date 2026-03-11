# Rojnishi — Production Readiness Checklist
> Full audit of the codebase as of 10 March 2026.
> Sections ordered by priority. Items within sections ordered by severity.

---

## 🔴 CRITICAL — App-Breaking / Security

### Auth & Session
- [ ] `DiaryProvider` wraps outside `Providers` (SessionProvider) in `layout.tsx` — flip the nesting. `Providers` must be outermost, then `DiaryProvider` inside. Currently `useDiary` will break on any page that needs session context before DiaryContext resolves.
- [ ] `useRef<HTMLUnknownElement>` in `AuthButton.tsx` — invalid type. Change to `useRef<HTMLElement>` or remove the ref entirely (it's never used).
- [ ] API routes have no rate limiting. A bot can spam `POST /api/diaries/[id]/entries` indefinitely. Add simple in-memory rate limiting or use Upstash Redis rate limiter.
- [ ] Image uploads in `DiaryEditorClient` store full base64 in MongoDB `content` field. A single entry with 3 images = ~3–5MB stored in a document. MongoDB document limit is 16MB. Move image uploads to Cloudinary (you already have it in your stack). Store the URL, not the base64.
- [ ] No CSRF protection on API routes. NextAuth provides it for its own routes but your `/api/diaries/*` routes are unprotected. Add `next-csrf` or verify `Origin` header server-side.
- [ ] `.env` variables `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `NEXTAUTH_SECRET`, `MONGODB_URI` — confirm none are committed to git. Check `.gitignore` explicitly includes `.env.local`.

### Data Integrity
- [ ] `serializeEntry` returns `createdAt` and `updatedAt` as raw `Date` objects, not ISO strings. When serialized over HTTP they become strings, but TypeScript types say `string` already — this will cause silent type mismatches. Add `.toISOString()` in both `serializeDiary` and `serializeEntry`.
- [ ] No input length limits on diary content. A malicious user can POST a 10MB HTML string as `content`. Add a server-side max content length check (~500KB is reasonable).
- [ ] `toObjectId()` silently returns `null` for invalid IDs. Every route correctly handles this, but `ObjectId.isValid()` returns `true` for any 12-byte string, not just proper ObjectIds. This is a known MongoDB quirk — add explicit 24-hex-char check: `if (!/^[a-f\d]{24}$/i.test(value)) return null`.

---

## 🟠 HIGH — Broken Features / Major UX Gaps

### Dashboard — `DiaryDashboardClient.tsx` + `Diaries.tsx`
- [ ] **Search bar is completely non-functional.** The `Input` is rendered with no `value`, no `onChange`, no filter logic. Either wire it up (client-side filter on `diaries` array by `title + description`) or remove the UI. It's visible, so it's a broken promise.
- [ ] Diary cards are fixed at `h-36 max-w-xs`. Cards with long titles or descriptions overflow or truncate badly. Redesign as flexible-height cards.
- [ ] No entry count shown on diary cards. User can't tell which diary has 0 vs 50 entries without opening it.
- [ ] No delete diary option from dashboard. Once created, a diary can only be deleted via API. Add a hover-reveal delete button with a confirmation dialog.
- [ ] No edit diary option (title/description/theme). The `PUT /api/diaries/[id]` route exists but no UI triggers it.
- [ ] Empty state ("no diaries") renders `null` — the page looks broken. Add an empty state with a prompt to create the first diary.
- [ ] `+ Add New Diary` button uses `mix-blend-difference` which looks broken on non-black backgrounds. Remove blend mode or handle it properly.

### Editor — `DiaryEditorClient.tsx`
- [ ] No delete entry functionality. The `DELETE /api/diaries/[id]/entries/[entryId]` route exists. Add a delete button when viewing an old entry (with confirmation).
- [ ] No edit/update of existing entries. The `PUT /api/diaries/[id]/entries/[entryId]` route exists. When viewing an old entry, add an "Edit" mode that unlocks the editor and calls `PUT` instead of `POST`.
- [ ] `contentEditable` + `innerHTML` direct assignment on `handleEntrySelect` will blow away React's reconciliation. On fast switching between entries this can cause stale content to persist visually. Add a `key` approach or `useLayoutEffect` to force DOM sync.
- [ ] Toolbar buttons use emoji as icons (`🖼`, `⬛`, `🔗`). These render differently across OS/browser. Replace with SVG icons or remixicon (already installed).
- [ ] `document.execCommand` is deprecated. All major browsers still support it but it's marked for removal. Long-term: migrate to a proper ProseMirror/Tiptap-based editor. Short-term: acceptable, but document the risk.
- [ ] No auto-save. If the user closes the tab mid-entry, all content is lost. Add a `localStorage` draft backup that restores on next open if an unsaved draft exists.
- [ ] `prompt()` for link insertion blocks the UI thread and is blocked in some sandboxed environments. Replace with an inline URL input popover.
- [ ] Entry list has no pagination or virtualization. If a diary has 200+ entries, rendering all cards will tank performance. Add `IntersectionObserver`-based lazy loading.
- [ ] No entry search within a diary. User must scroll through all entries to find one. Add a search/filter input at the top of the left panel.
- [ ] Word count updates on every keypress via `useMemo` — this is fine but `htmlContent.replace(/<[^>]*>/g, "").length` runs twice (once for chars, once in `canSave`). Cache it.

### `NewDiaryForm.tsx`
- [ ] GSAP animates `bottom` CSS property (layout reflow, jank on low-end devices). Change to `transform: translateY`. The `useGSAP` call targets `y` which is a GSAP transform — but the `style={{ bottom: 0 }}` initial inline style conflicts. Remove the `bottom` style, use `translateY(100%)` as initial state only.
- [ ] `DiaryPreview` (Three.js) inside `NewDiaryForm` mounts every time the theme selection panel opens. Heavy. Add a `useMemo` or lazy-init pattern so the scene is only created once.
- [ ] Theme selection has only 3 textures hardcoded. Make it data-driven from a config file.

### `LenisProvider.tsx`
- [ ] Uses `@studio-freight/lenis` (deprecated package). The repo moved to `lenis`. You have both installed. Remove `@studio-freight/lenis`, update import to `lenis`. They're API-compatible.

### `Navbar.tsx`
- [ ] `isDiaryDetailPage` regex `/^\/diary\/.+/.test(pathName)` — returns `null` when on `/diary/[id]`. This hides the navbar. Fine for now. But if you add sub-routes like `/diary/[id]/settings`, the regex won't match. Use `pathName.startsWith('/diary/') && pathName.length > 8` instead.
- [ ] Navbar renders on `/login` page — looks weird alongside the auth card. Add `/login` to the hidden routes.

---

## 🟡 MEDIUM — Code Quality / Developer Experience

### Architecture
- [ ] `DiaryProvider` initialized with `selectedTexture: "/textures/leather-texture.jpg"` but typed as `string | null`. Pick one — it's never null on init. Fix the type or fix the init value.
- [ ] `useSetupScene.ts` initializes refs imperatively in the hook body (outside `useEffect`): `sceneRef.current = new THREE.Scene()` etc. This runs on every render before effects, which is wrong. Wrap initialization in a `useMemo` with `[]` deps, or use a lazy ref init pattern.
- [ ] `AuthButton.tsx` → `profileFigureRef = useRef<HTMLUnknownElement>` is never used. Delete it.
- [ ] `ProtectedRoute.tsx` exists but is never used anywhere. The protection logic is duplicated in each server page (`diary/page.tsx`, `diary/[id]/page.tsx`) via `getServerSession`. Either use one pattern or delete the component.
- [ ] `_shared.ts` `getSessionUserId` returns `string | null` but callers type-assert `user.id` as `string` with optional chaining. Inconsistency. Keep the `null` return, remove the non-null assertions.

### Performance
- [ ] `globals.css` defines both `var(--background)` in `:root` directly AND inside `@layer base :root`. The `@layer base` version overwrites the top-level one. The direct `:root` block is dead code — remove it.
- [ ] Three.js in `Diary3D` loads on every page (it's rendered in `ClientLayout` conditionally by `pathname === '/'`). However, `ClientLayout` is imported at the root layout level. The Three.js bundle is part of the initial bundle for every page. Move `Diary3D` to a `dynamic(() => import(...), { ssr: false })` import.
- [ ] `OrbitControls` is imported from `three/examples/jsm/controls/OrbitControls` — this path is not tree-shakeable. In production builds, this can bloat the bundle. Use `three-stdlib` which provides the same utilities with proper ESM tree-shaking.
- [ ] No `loading.tsx` / `error.tsx` files for the `/diary` or `/diary/[id]` routes. Add Next.js route-level error boundaries.
- [ ] No `next/image` optimization for user profile images in `AuthButton`. The `src` comes from Google/GitHub CDN. Add `remotePatterns` config in `next.config.ts` for `lh3.googleusercontent.com` and `avatars.githubusercontent.com`.

### TypeScript Strictness
- [ ] `const data: unknown = await response.json()` in `Diaries.tsx` — then immediately cast as `Diary[]`. Add a runtime type guard instead of a blind cast.
- [ ] `as Partial<DiaryResponse> & { error?: string }` used in `DiaryEditorClient` — this is a lie to TypeScript. If the API returns a completely different shape, you'll get silent failures. Add `zod` schema validation on API responses, or at minimum add explicit field checks.
- [ ] `isNaN()` used instead of `Number.isNaN()` in formatter functions in `DiaryEditorClient`. `isNaN()` coerces strings. Use `Number.isNaN()` throughout.

---

## 🟢 FEATURES — Not Started, Planned in Landing Page

> These are listed in `WhyChooseThis.tsx` as selling points. All are currently absent.

- [ ] **AES Encryption** — Entries stored in plaintext in MongoDB. Implement client-side AES-256-GCM encryption (Web Crypto API). Key derived from user's passphrase, never sent to server. This is the #1 promise of the app.
- [ ] **Offline Mode** — Service Worker + IndexedDB. Cache entries locally, sync on reconnect. Use Workbox.
- [ ] **AI Sentiment Analysis** — Per-entry mood score. Call OpenAI/Anthropic API on save. Store `mood: { score, label }` in entry document. Display mood trend chart on dashboard.
- [ ] **Reminders & Notifications** — Web Push API. Prompt user for notification permission. Schedule daily reminder via a CRON job (Vercel cron or similar).
- [ ] **Voice-to-Text** — Web Speech API (`SpeechRecognition`). Add a mic button to the toolbar. Transcribe and insert at cursor position.
- [ ] **Custom Themes** — Currently only 3 hardcoded textures in `NewDiaryForm`. Allow user to upload a custom texture image.

---

## 🔵 UI/UX POLISH — Editor

- [ ] Toolbar needs proper SVG icons, not emoji. Inconsistent rendering is a professionalism issue.
- [ ] Font size control (small/normal/large) in toolbar.
- [ ] Text alignment buttons (left/center/right) in toolbar.
- [ ] Highlight/mark tool in toolbar.
- [ ] Table insertion — `execCommand` can't do tables. Use a custom HTML insertion with a grid picker UI.
- [ ] Drag-and-drop image upload (dragover + drop events on the editor container).
- [ ] Keyboard shortcut for blockquote (none set currently).
- [ ] Editor placeholder "How was your day?..." should only show when editor is completely empty AND the user hasn't clicked "new entry". Currently it flashes briefly on every entry switch.
- [ ] "Viewing · date" badge overlaps with save button area on narrow screens.
- [ ] Entry preview in left panel strips all HTML tags — styled text shows as plain text. Show a styled mini-preview or render a safe HTML subset.
- [ ] No confirmation on navigating away with unsaved content. `beforeunload` event listener needed.
- [ ] Autofocus on editor when "new entry" is clicked — currently works via `setTimeout(40ms)` which is a race condition. Use `flushSync` + `requestAnimationFrame` for reliable focus.

---

## 🔵 UI/UX POLISH — Dashboard & Landing

- [ ] Dashboard diary cards need: entry count, last written date, theme color accent, hover state with preview.
- [ ] Landing page `<h1>` background "DIARY" text renders via `ClientLayout` on every non-home page including `/login` — looks broken there. Add `/login` and `/diary/*` to the exclusion list.
- [ ] Login page uses hardcoded `#` for Terms of Service and Privacy Policy links. Create these pages or remove the links before going public.
- [ ] Mobile: `AuthButton` shows full name + email in navbar even on small screens — overflows. Add `max-w` truncation.
- [ ] `WhyChooseThis` features that don't exist yet (offline, AI, voice) should be marked "Coming Soon" rather than presented as live features. This is a trust issue.

---

## ⚙️ INFRASTRUCTURE & DEPLOYMENT

- [ ] Add `next.config.ts` `images.remotePatterns` for Google and GitHub avatar CDNs (currently `next/image` will throw in production).
- [ ] Set `NEXTAUTH_URL` in production env vars on Vercel. Without it, NextAuth callback URLs break.
- [ ] Add `Content-Security-Policy` header in `next.config.ts`. The app loads Google Fonts, Three.js, user images — CSP must allow these.
- [ ] MongoDB indexes: add `{ userId: 1, createdAt: -1 }` index on `diaries` collection and `{ diaryId: 1, userId: 1, createdAt: -1 }` on `entries`. Without indexes, queries do full collection scans.
- [ ] Add `robots.txt` and `sitemap.xml`. Currently the app has `metadataBase` set but no sitemap generation.
- [ ] Remove `console.error` calls in production. Every API route has unguarded `console.error`. Replace with a proper logger (Pino) or at minimum wrap in `process.env.NODE_ENV !== 'production'` guards.
- [ ] No health check endpoint. Add `GET /api/health` that pings MongoDB and returns `200 OK` or `503`.
- [ ] Vercel `functions` timeout — MongoDB cold starts on serverless can timeout. Add connection caching (already partially done in `mongodb.ts`) and confirm `maxPoolSize` is set to 1 for serverless.
- [ ] Bundle analysis — run `@next/bundle-analyzer`. Three.js alone is ~600KB uncompressed. Confirm tree shaking is working.

---

## 📋 QUICK WINS (< 1 hour each)

- [ ] `@studio-freight/lenis` → `lenis` import swap in `LenisProvider.tsx`
- [ ] `useRef<HTMLUnknownElement>` → `useRef<HTMLElement>` in `AuthButton.tsx`
- [ ] `DiaryProvider` / `Providers` nesting fix in `layout.tsx`
- [ ] `isNaN` → `Number.isNaN` across all formatter functions
- [ ] Search bar — wire up client-side filter on `diaries` state in `DiaryDashboardClient`
- [ ] `.toISOString()` in `serializeDiary` and `serializeEntry`
- [ ] Add `next/dynamic` for `Diary3D` with `ssr: false`
- [ ] Add MongoDB indexes via a seed/migration script
- [ ] `dead ProtectedRoute.tsx` — delete the file
- [ ] Remove dead `body` rule duplication in `globals.css`
- [ ] Add `loading.tsx` and `error.tsx` to `/app/diary/` and `/app/diary/[id]/`
- [ ] Navbar hidden on `/login` — add to `isDiaryDetailPage`-equivalent check

---

## 📊 PRIORITY EXECUTION ORDER

```
Week 1 (Pre-MVP hardening):
  All 🔴 CRITICAL items
  Quick Wins list
  Search bar fix
  Delete entry UI
  Edit entry UI
  Empty state on dashboard
  Auto-save draft (localStorage)

Week 2 (Feature completeness):
  AES encryption (this is the core promise)
  Image → Cloudinary upload
  Toolbar SVG icons
  Mobile responsiveness pass
  Dashboard card redesign
  Pagination on entry list

Week 3 (Infrastructure):
  MongoDB indexes
  CSP headers
  Bundle analysis + Three.js dynamic import
  Rate limiting
  Production env vars audit
  Health check endpoint

Post-launch:
  Offline mode (Service Worker)
  AI Sentiment Analysis
  Voice-to-Text
  Reminders / Push Notifications
```
