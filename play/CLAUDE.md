# CLAUDE.md - play/

Svelte/Phaser frontend, pusher server, and Room API server.

## Areas

- `src/front/`: browser application, Svelte UI, Phaser, media, and WebRTC.
- `src/pusher/`: WebSocket and HTTP server-facing logic.
- `src/room-api/`: Room API implementation.
- `src/i18n/`: source translations and generated types.
- `tests/`: Vitest tests; additional tests are colocated under `src/`.

## Common commands

```bash
cd play

npm run typecheck
npm run svelte-check
npm run lint
npm run pretty-check
npm test
npm run build
```

Prefer checks over mutating commands during validation. Use `npm run lint-fix` and `npm run pretty` only when fixing files.

Run a focused unit test once:

```bash
cd play
npm test -- --run tests/front/Utils/TokenBucket.test.ts
```

## Generated prerequisites

After changing protobufs, generate messages from `messages/`. After changing translation keys, run:

```bash
cd play
npm run typesafe-i18n
npm run i18n:check
```

A new key must be added to **every** locale under `src/i18n/<locale>/`, or `i18n:check` fails.

Do not edit generated `src/i18n/i18n-*.ts` files directly.

## Frontend conventions

- The session JWT never travels in a URL: browser calls send `Authorization: Bearer`,
  pusher handlers (`/me`, `/logout`, `/profile-callback`) accept only that header and
  answer 401 without it, and post-login handoffs write `localStorage.authToken` through
  `redirectToRoom.html`/`redirectToMatrix.html` instead of appending `?token=`.
- New and migrated Svelte components use Svelte 5 runes (`$props`, `$state`, `$derived`, `$effect`).
- Panels the action bar opens (agenda, tasks, chat, users) are tabs of the chat sidebar:
  `navChat.switchToCustomComponent(...)` plus `chatVisibilityStore.set(true)` — never a second
  absolutely-positioned drawer, which would duplicate the close control and sit open beside the users list.
  The profile menu's Inventory entry (`Components/Inventory/sidebar.ts`) follows the same pattern.
- The chat drawer's search field is always visible in its header; Cmd/Ctrl+K opens the user list
  and focuses it (`Components/searchShortcut.ts` decides the keystroke, `chatSearchFocusRequest`
  asks the header to take focus). The map script no longer registers its own search button.
- Calendar meeting-room events keep the room URL in the Google Calendar event *location* with a bare
  area name in the hash (`…/~/trinityroots/office.wam#Lounge`). `CalendarJoinButton.goThere` walks the
  player to that area in place; `#moveTo=<area>` is the in-app link form.
- The calendar connect flow is `CORE_URL/auth/google?return=<play origin>`; core redirects back with
  `?calendar=connected`, which `consumeCalendarConnectedParam()` (CalendarLoader) strips before the
  first refresh. The panel's Connect button shows whenever `isActivatedStore` is false.
- Mic auto-mute: `startMicAutoMute()` (MainLayout onMount) mutes an idle microphone when the window
  loses focus; `isInActiveConversationStore` gates it so a running conversation keeps its mic.
- Match the translation import style and UI patterns of neighboring components.
- Event listeners and subscriptions must have explicit cleanup. ESLint checks listener removal and ignored subscriptions.
- For Phaser or media behavior, test actual runtime state rather than relying only on rendered DOM state.

## Related guides

- `../docs/agent/testing-vitest.md`
- `../docs/agent/svelte.md`
- `../docs/agent/i18n.md`
- `../docs/agent/typescript-style.md`
- `../docs/agent/devtools.md`
