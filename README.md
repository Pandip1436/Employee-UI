# Employee-UI

React 19 + TypeScript + Vite frontend for the Employee Portal. Tailwind CSS v4, React Router v7, Axios, Recharts. Premium glassmorphism UI with dark mode, animated gradients, single-session JWT handling, and role-aware routing.

> Part of the [Employee Portal](../README.md) monorepo. See [`PROJECT_DOCUMENTATION.md`](../PROJECT_DOCUMENTATION.md) for the full reference (every page, API client, component).

---

## Stack

| Concern | Library |
|---|---|
| Framework | React 19 |
| Language | TypeScript ~5.9 |
| Build | Vite 8 |
| Routing | react-router-dom v7 |
| HTTP | axios |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) |
| Charts | recharts |
| Icons | lucide-react |
| Toasts | react-hot-toast |
| Dates | date-fns |
| Class utils | clsx |
| Lint | eslint + typescript-eslint |
| E2E (optional) | @playwright/test |

---

## Folder Structure

```
src/
├── api/                 # Axios instance + per-feature API clients
│   ├── axios.ts         # JWT interceptor, 401 redirect, loader bus
│   ├── authApi.ts
│   ├── attendanceApi.ts
│   ├── dashboardApi.ts
│   ├── leaveApi.ts
│   ├── timesheetApi.ts
│   ├── holidayApi.ts
│   ├── notificationApi.ts
│   └── ...
├── components/          # Reusable UI
│   ├── Drawer.tsx       # Right/left slide-over with accent themes
│   ├── PremiumLoader.tsx
│   ├── TimerWidget.tsx
│   ├── ConfirmDialog.tsx
│   ├── NotificationBell.tsx
│   └── ...
├── context/             # Global state
│   ├── AuthContext.tsx
│   ├── CompanyContext.tsx
│   ├── ConfirmContext.tsx
│   └── ThemeContext.tsx
├── layouts/
│   ├── AppShell.tsx     # Sidebar + Topbar wrapper
│   ├── Sidebar.tsx      # Role-aware nav, premium scrollbar
│   └── Topbar.tsx       # Search, profile dropdown, theme toggle
├── pages/               # Feature pages (one folder per area)
│   ├── auth/Login.tsx
│   ├── dashboard/Dashboard.tsx
│   ├── dashboard-hr/HrDashboard.tsx
│   ├── attendance/Attendance.tsx
│   ├── attendance-reports/AttendanceReports.tsx
│   ├── team-attendance/TeamAttendance.tsx
│   ├── timesheet-home/
│   ├── timesheet-weekly/
│   ├── timesheet-history/
│   ├── timesheet-detail/
│   ├── timesheet-approvals/
│   ├── admin-timesheet-export/
│   ├── leave-apply/
│   ├── projects/Projects.tsx
│   ├── admin-*/
│   └── ...
├── types/index.ts       # Shared frontend types (mirrors backend)
├── utils/
│   ├── format.ts        # fmtHours, fmtDate, etc.
│   └── loaderBus.ts     # Global loading indicator
├── App.tsx              # Route table + lazy imports
├── main.tsx             # Entry, providers, router, Recharts warn filter
└── index.css            # Tailwind + custom (.sidebar-scroll)
```

---

## Setup

```bash
npm install
# Optional: create .env with VITE_API_URL pointing at your backend
npm run dev                # http://localhost:5173
```

The backend must be running (default `http://localhost:5000`). Without `VITE_API_URL`, the axios client falls back to `/api` (handy if you proxy or deploy behind the same origin).

---

## Scripts

```bash
npm run dev      # Vite dev server with HMR
npm run build    # tsc -b && vite build → dist/
npm run preview  # Preview the built bundle locally
npm run lint     # ESLint
```

---

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `VITE_API_URL` | Backend API base URL | `http://localhost:5000/api` |

Create `.env` (or `.env.local`) at the `Employee-UI/` root. Variables must be prefixed with `VITE_` to be exposed to the client bundle.

---

## Routing

Routes are defined in [`src/App.tsx`](src/App.tsx), all lazy-loaded. Public routes (login, password reset) live outside `AppShell`; everything else renders inside it.

Role-aware redirects:
- `/dashboard` → admins redirect to `/dashboard/hr`, managers to `/dashboard/manager`, employees stay
- Admin-only routes are guarded inside `AppShell` and hidden from the sidebar for non-admins

---

## Auth Flow

1. **Login** (`pages/auth/Login.tsx`) → `authApi.login()` → stores JWT in `localStorage` or `sessionStorage` depending on "Stay logged in"
2. **Axios interceptor** ([src/api/axios.ts](src/api/axios.ts)):
   - Attaches `Bearer <token>` to every request
   - Starts the global loader bus on every request, stops on response/error
   - On `401`: clears storage, stashes the server message into `sessionStorage.postLogoutMessage`, then hard-redirects to `/login`
3. **Login page** reads `postLogoutMessage` on mount and replays it as a toast (so messages survive the hard redirect)
4. **AuthContext** ([src/context/AuthContext.tsx](src/context/AuthContext.tsx)) exposes `user`, `isAdmin`, `isManager`, login/logout helpers

Single-session enforcement: if the backend rejects with `"You've signed in from another device"`, the interceptor redirects to login and the toast replays the message.

---

## Theming

- **Light/Dark mode** managed by `ThemeContext`. Toggle in topbar.
- Tailwind v4's `dark:` variant is applied via the `class` strategy on `<html>`.
- Most components use the dual-class pattern: `bg-white dark:bg-gray-900`, `text-gray-900 dark:text-white`, etc.
- Premium accent gradients (indigo, violet, emerald, amber, rose, sky) are configured in shared components like `Drawer.tsx`.

---

## Leave & Holiday Overlay

A consistent "leave / holiday counts as a working day" treatment runs across the employee-facing pages. Each leave or holiday day contributes **9 hours** to the displayed totals.

| Page | What you see |
|---|---|
| **Employee Dashboard** | When on leave today, the Clock In button is replaced with a sky-tinted "You're on leave today" banner. "Upcoming Holidays" card surfaces the next four holidays. |
| **My Attendance** | Same on-leave banner on the hero. Today's row auto-appears in the table even before the 14:30 cron. "Absent" rows that overlap an approved leave are silently re-classified as "On Leave". "On Leave" filter pill added. |
| **Timesheet Home** | Day-strip bars stack work (indigo) + leave (sky) + holiday (amber). Hero KPI chips show leave/holiday hours. Recent Activity rows show combined totals + per-week leave/holiday chips. |
| **Weekly Timesheet** | Auto-fills a Leave row and a Holiday row when those days fall in the displayed week. Day totals + week total + 40h progress bar all include them. |
| **Timesheet History** (list, drawer, full page) | Each row shows combined hours + chips; the detail views show dedicated Leave + Holiday rows with locked 9h pills per day. |
| **Timesheet Approvals (manager)** | Per-row sky/amber chips so managers understand why work hours are low. Preview drawer shows full Leave + Holiday rows. |
| **Admin Timesheet Export** | Table on screen + CSV + Excel exports all carry separate **Work / Leave / Holiday / Total** columns. |
| **Attendance Reports** | New "Leave" column (sky badge) and "Avg Leave" KPI tile. |

---

## Key Reusable Components

| Component | Notes |
|---|---|
| `Drawer` ([components/Drawer.tsx](src/components/Drawer.tsx)) | Right/left slide-over with `accent` prop (6 themes), animated entrance, hinge seam stripe, clean header, premium footer. Used by project details, leave details, etc. |
| `NotificationBell` ([components/NotificationBell.tsx](src/components/NotificationBell.tsx)) | Polls unread count every 60s. Opening the bell clears the unread badge immediately (Slack/Gmail style). On mobile, the dropdown stretches across the viewport (`fixed inset-x-2`); on `sm+` it anchors as a normal dropdown under the bell. |
| `PremiumLoader` | Full-page loading screen with logo, spinning gradient ring, counter-rotating arc, pulsing glow halo |
| `TimerWidget` | Live clock-in elapsed time, rendered in employee dashboard |
| `ConfirmDialog` | Promise-based confirm modal, used via `useConfirm()` from `ConfirmContext` |
| `Modal` | Centered modal scaffold with backdrop blur |

---

## Custom Styles

Defined in [`src/index.css`](src/index.css):

- `.sidebar-scroll` — premium thin scrollbar that's invisible idle, fades in on hover, gradient thumb with glow, no arrow buttons. Used in sidebar nav and drawer bodies.

---

## Build & Deploy

```bash
npm run build
# Output: dist/
```

**Cloudflare Pages** (currently deployed): <https://unitednexa-employeeportal.pages.dev>

Build command: `npm run build`
Output directory: `dist`
Environment: set `VITE_API_URL` to your production backend URL.

Cloudflare Pages auto-handles SPA fallback (all routes serve `index.html`). On other hosts (Netlify, Vercel, S3+CloudFront, nginx), configure the same fallback.

---

## Conventions

- **Imports use relative paths** (`../../api/...`). No path aliases configured.
- **Pages are lazy-loaded** in `App.tsx` to keep the initial bundle small.
- **API clients** live in `src/api/` and return raw axios responses; pages destructure `r.data.data` to get the payload.
- **Tailwind v4 syntax** — uses `bg-gradient-to-br` (not the new `bg-linear-to-br`); stay consistent with existing files. The IDE may suggest canonical forms — leave them be for consistency.
- **Premium UI patterns** — gradient blob halos, dot-grid masks, animated hairlines, glassmorphism rings, hover-lift transitions.
- **Local dates over UTC** — when formatting calendar dates from `Date` objects, always use local-time components (`getFullYear`, `getMonth`, `getDate`). `toISOString().slice(0, 10)` rolls back a day for users east of UTC (e.g. IST). A reusable pattern: `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`.

---

## Common Pitfalls

- **API calls 401 in a loop** — check `VITE_API_URL` is correct and that the backend is reachable. The interceptor redirects to `/login` on every 401.
- **Toasts disappear after redirect** — use the `postLogoutMessage` sessionStorage pattern (see [`api/axios.ts`](src/api/axios.ts) and Login.tsx).
- **Logo doesn't load** — check `CompanyContext` has loaded; fallback chain is `dashboardLogo → logo → /logodarkmode.png`.
- **Build fails with `tsc` errors** — run `npx tsc -p tsconfig.app.json --noEmit` to see the same errors locally.
- **"Yesterday" quick-pick jumps back two days** — UTC vs local date bug. Use the `ymdLocal(d)` pattern above instead of `toISOString().slice(0, 10)`.
- **CSV dates show as `########` in Excel** — Excel auto-converted them to date cells. Output the date as `="2026-05-25"` (text-formula prefix) so Excel keeps it as text. Helper pattern in [`pages/admin-timesheet-export/AdminTimesheetExport.tsx`](src/pages/admin-timesheet-export/AdminTimesheetExport.tsx).
- **Recharts "width(-1) and height(-1)" warning in dev** — StrictMode double-mounts charts before their grid parent lays out. Suppressed at [`main.tsx`](src/main.tsx) via a targeted dev-only `console.warn` filter; the warning is harmless and only appears in development.
- **Notification bell dropdown cut off on mobile** — handled. The dropdown uses `fixed inset-x-2` on mobile and `sm:absolute sm:right-0` on tablet/desktop. Don't revert to a fixed width.
