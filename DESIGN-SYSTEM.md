# VOD design system

## Direction and scope

Approved direction: **Neutral studio**. Light neutral surfaces, charcoal text,
restrained green actions, and clear typography. Apply design checks during
implementation. ENERGY 1 / RHYTHM 2 / MOTION 1.

This application supports account access and an admin source-video library,
not a finished streaming service.
The existing routes support public entry, account selection, admin sign-in,
guest sign-in and registration, separate account dashboards, and admin video
upload, metadata, and deletion screens. Preserve these
routes, guard boundaries, validation, remember-me behavior, and sign-out actions.
Do not imply that playback, transcoding, thumbnails, or analytics are available.

Evidence: `routes/web.php`, `BrowserAuthController`, and the existing Inertia
pages. Visual decisions are project judgments approved by the user, not findings
from user research. No third-party reference screens or customer imagery are used.

## Layout ownership

Every Inertia page uses one persistent layout, selected in `resources/js/app.jsx`.
Layouts live in `resources/js/Layouts/`; pages own their title and content, never
duplicate the surrounding navigation, account controls, or footer.

| Area | Existing pages / endpoints | Layout | Purpose |
| --- | --- | --- | --- |
| Public | `Welcome`, `/` | `PublicLayout` | Explain the current service and direct visitors to account access. |
| Auth | `/sign-in`, `/adm/sign-in`, `/guest/sign-in`, `/guest/register` | `AuthLayout` | Keep branding, recovery links, and form placement consistent across account flows. |
| Admin | `Auth/AdminDashboard`, `/adm`; future `Admin/*` pages | `AdminLayout` | Workspace shell with labeled navigation and the admin sign-out action. |
| Guest | `Auth/GuestDashboard`, `/guest`; future `Guest/*` pages | `GuestLayout` | Simpler personal-account shell with guest navigation and sign-out. |

The legacy dashboard component names are retained to avoid changing the backend
contract. Admin and guest layout selection takes precedence over `Auth/*`.
New public screens use `Public/*`, auth screens `Auth/*`, admin screens `Admin/*`,
and guest screens `Guest/*`. Each prefix maps to its layout centrally. Unknown
areas must be assigned explicitly rather than silently inheriting a wrong shell.

## Tokens

`resources/css/app.css` is the source of truth. Use semantic CSS variables, never
page-local hex colors. One neutral family, one green accent family, semantic red
for errors only. No gradients, decorative shadows, status dots, or fake imagery.

| Role | Token | Value |
| --- | --- | --- |
| Page ground | `--ground` | `#f5f6f5` |
| Main surface | `--surface` | `#ffffff` |
| Grouped surface | `--surface-subtle` | `#eceeec` |
| Text | `--ink` | `#202520` |
| Secondary text | `--muted` | `#596159` |
| Structure | `--line` | `#dce0dc` |
| Input boundary | `--control-line` | `#7b857b` |
| Primary action / focus | `--accent` | `#245c40` |
| Hover | `--accent-hover` | `#19462f` |
| Pressed | `--accent-active` | `#123823` |
| Error | `--danger` | `#a32929` |
| Error surface | `--danger-surface` | `#fff0f0` |

The green action identifies the next step without coloring the navigation.
Neutral tonal surfaces group account details without turning every value into a
card. Dark text keeps long sessions readable; the approved direction is light
only, so no nonfunctional theme toggle is provided.

## Typography, space, and shape

- One typeface: Instrument Sans, retained from the existing Vite font pipeline.
  It keeps the app's typographic continuity and is bundled locally at build time.
  Use system sans-serif fallbacks while fonts load; do not add another family.
- Body and inputs: 1rem / 1.5. Secondary text and navigation: .875rem / 1.5.
- Section titles: 1.125rem; account/auth page titles: 1.75rem; public display:
  fluid 2.5rem to 4.5rem. One display size per screen.
- Weights: 400, 500, 600. Tightened heading tracking; balanced headings and
  readable paragraphs capped at 60 characters.
- Space scale: 4, 8, 12, 16, 24, 32, 48, 64 pixels, expressed in rem.
  Use 8px within a field, 24px between fields, 32px between related sections.
- Shape lock: controls 4px, panels 8px, initial avatars circular. No other
  decorative radii. Shadows are reserved for genuinely floating surfaces.
- A page frame is at most 1200px, with equal 20px phone / 32px desktop gutters.
  Admin has a 240px navigation column; remaining width belongs to content.
- Shared detail grids use two equal columns with a 24px gap; at narrow widths,
  they become one column. No empty grid tracks or ungrounded KPI tiles.

## Components and interactions

### Admin video library

- The shared library, upload page, and details editor use `AdminLayout` and
  regular session-authenticated web routes, not token-based API routes.
- Follow the file-selection and parallel details-editing flow described in
  [YouTube Studio's upload guide](https://support.google.com/youtube/answer/57407?hl=en).
  Keep our neutral studio tokens, and omit YouTube features the product lacks.
- Upload one video at a time within a browser tab. Upload state lives above the
  pages in the persistent admin layout, so admin navigation does not stop transfer.
- On phones, upload progress appears before metadata fields. Progress must not
  be hidden below a long form; a compact status panel remains on other admin pages.
- Show byte-based progress, elapsed wall time (including pauses), rolling transfer
  speed, and estimated remaining time. “Estimating…” is correct when speed is
  unknown. Transfer percentage may decrease on retry as unconfirmed bytes reset.
- A 100% transfer is not completion. Show a separate verification state, retaining
  a retry action when the completion response fails.
- Restore only the session reference and file metadata after reload, never file
  bytes or signed URLs. Require the original file to resume. Same-tab recovery
  checks name, size, MIME and modification date; server-listed sessions can only
  check name, size and MIME, so the user must choose the unchanged original.
- Metadata is explicitly saved; warn before abandoning unsaved edits. Completion
  must not remove the editor when the transfer completes; retain unsaved text
  until it is saved or the user explicitly dismisses it. Deletion
  uses a native modal dialog naming the video, defaults focus to Keep video, and
  retains the dialog on errors. Never remove a row optimistically when deletion
  has not succeeded.
- Incomplete and deletion-pending videos stay visible. Do not invent a thumbnail,
  duration, playback control, publishing setting, or a zero-count metric.

- `Brand`: plain application name from shared Inertia props, not an invented logo.
- `Button`: primary (green), secondary (tonal), or text; navigation stays a link.
- `FormField`: visible label, native input, associated hint and error, appropriate
  autocomplete, and a minimum 48px field height. Never disable paste.
  Password inputs include an inline Show/Hide button with a field-specific
  accessible name. Each field toggles independently, starts masked, and masks
  again when cleared. Toggling must not submit the form or change its value.
- `SignInForm`: shared admin/guest submission, remember-me, pending and errors.
- `SignOutButton`: guard-specific POST, pending text, duplicate-submit prevention.
- `AccountDetails`: a single description list using real controller-provided
  name and email, with long values wrapping.
- `AvailabilityNotice`: explicitly states that the unimplemented video tools are
  not available. It is not a fabricated empty library or a zero-count claim.
- Passwords are cleared when a submission finishes. Registration guidance must
  match the server's minimum, not invent new password policy.

Only real destinations appear in navigation. Active links use both `aria-current`
and a neutral selected surface. Do not add search, notifications, metrics, upload
buttons, or menu placeholders until their underlying features exist.

## Accessibility and responsive behavior

- One `h1`, a unique page title, semantic header/nav/main/footer, and a skip link.
- Explicit `:focus-visible` outline, not color-only feedback. Native buttons,
  links, checkboxes, and forms. Interactive targets at least 44px.
- Normal text contrast target 4.5:1; control boundaries and focus at least 3:1.
  Errors use text, `aria-invalid`, `aria-describedby`, and a live announcement.
- Below 640px: single-column content, full-width forms, wrapping account values.
- At 640–959px: centered forms and two-column detail content where it fits.
- At 960px: admin sidebar and split auth layout. Below that, admin navigation
  becomes a visible horizontal header; with only one destination, no hidden menu
  is needed. Add a keyboard-accessible disclosure if navigation grows.
- No nested form scroll areas, clipped text, fixed content heights, or fixed bars
  covering controls. Respect reduced motion; content is never hidden on entrance.
- Motion is limited to short button press feedback; no autoplay or decorative
  page entrances.

## States and verification

Forms retain non-secret input on validation errors, associate each error with its
field, and show pending text while disabling duplicate submission. Server-driven
account data renders with the page; no fake loading skeletons are needed.
Future asynchronous data views must define loading, empty, failure/retry, and
populated states before shipping.

For changes: run `npm run build`, the relevant Laravel feature tests, and visual
checks at 390, 768, and 1440px. Check keyboard focus, invalid submissions, pending
feedback, long names/emails, both guard-specific sign-outs, and navigation.
Browser fixtures must be isolated from the real database and clearly be test data.

## Design decision record

- **Choice:** distinct area layouts with shared primitives, rather than one
  conditional mega-layout or four duplicate page shells.
  **Evidence:** explicit user request and four route groups.
  **Trade-off:** four small shell components, but common styling and behavior
  remain shared.
- **Choice:** sparse, honest account dashboards rather than seeded charts or an
  invented media catalogue. **Evidence:** controllers expose name and email only.
  **Trade-off:** less visual density until real video functionality is integrated.
- **Choice:** open-plane admin shell and simpler guest top navigation, informed
  by the editorial-greeting app direction (seed 1654068313).
  The preset's count tiles are omitted because no count data exists; green
  actions and the light palette follow the approved direction.
- **Public argument:** explain account access, offer guest sign-in, then identify
  the separate admin route. No unsupported marketing claims or stock imagery.

## Initial implementation checks

- Production build: passed. The existing font pipeline warns that optional
  optimized fallbacks need `fontaine`; no dependency was added.
- UI/auth feature tests: 15 passed, 136 assertions, including all seven page
  contracts and the existing sign-in, registration, and guard-specific sign-outs.
- Browser smoke check: 42 checks passed against the production assets, all seven
  pages at 320, 390, 768, and 1440px. Verified layout selection, one main/h1,
  no horizontal overflow, field labels, touch targets, auth layout persistence,
  keyboard skip link/focus, remember-me, pending submission, field errors,
  password clearing, registration, sign-out, long values, and reduced motion.
  Dashboard account data and submission responses were mocked; no real account
  or application database was changed. Backend auth was tested with PHPUnit.
- Render inspector: zero failures for auth forms and dashboard fixtures at
  390/768/1440px. The dashboard whitespace warnings are accepted because the only
  available data is name/email; adding fake charts or filling the viewport with
  more panels would be misleading. The public display-size warning from the
  app-screen inspector is accepted: the public entry page is not a task screen.
- Contrast: primary text/ground 14.39:1; secondary text/white 6.40:1;
  secondary text/grouped surface 5.49:1; primary action 7.84:1; error/white
  7.23:1; focus/ground 7.23:1. Input boundary/white is 3.83:1, meeting the
  non-text 3:1 target; this token is not used for text.
- Consistency count: one accent family, one neutral family, one font family,
  two component radii, no icon sets, no decorative emoji, no gradients.
- Full-suite limitation: 25 tests passed and one existing migration test errored.
  `VideoLibraryMigrationTest:22` creates `vod_videos` even though its
  `RefreshDatabase` setup already created that table. Reproduced independently;
  left unchanged because it is not part of the UI redesign.

### Delivery gate

| Area | Result | Evidence / limitation |
| --- | --- | --- |
| Product | Pass | Strong repository evidence: all existing routes and account data preserved. |
| UX | Pass | Existing navigation, auth persistence, errors, registration, sign-out checked. |
| UI | Pass | Neutral studio direction, task-sized headings, distinct area shells rendered. |
| Design system | Pass | Shared tokens, primitives, persistent layouts, agent instructions. |
| Accessibility | Not fully verified | Contrast, native labels, skip link, focus and targets checked; no screen-reader or physical-device audit. |
| Responsive | Pass | All seven screens checked at four widths; no horizontal overflow. |
| Edge cases | Pass | Invalid credentials, registration errors, long account values, reduced motion checked within UI scope. |
| Code quality | Pass within scope | Build, 15 relevant tests, formatter, source lint and whitespace checks passed; unrelated full-suite failure noted above. |
| Visual QA | Pass within scope | Chromium screenshots reviewed at 390/768/1440; dashboard fixtures rather than live accounts. |
| Anti-slop | Pass | No fabricated content, dead destinations, charts, decorative assets, or unnecessary motion. |
| Final | Not fully verified | Screen-reader/device audit and user testing have not been performed. |
