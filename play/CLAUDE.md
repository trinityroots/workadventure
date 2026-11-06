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
  loses focus or the tab hides (`focusStore` + `visibilityStore`, same machinery as PrivacyShutdown);
  `isInActiveConversationStore` gates it so a running conversation keeps its mic.
- NPCs come from the game service (`Services/npcList.ts`, `GET /api/game/npc/list`) and spawn
  as native entities with the player-style `UsernameDisplay` badge whose availability dot is
  replaced by a role icon (`Phaser/Components/npcRoleIcons.ts`). Clicking one walks the player
  to an adjacent tile (`GameScene.onNpcClicked`) and opens `NpcChat/NpcChatPanel.svelte` on
  arrival; **X** opens the nearest NPC within 120px (same focus/input guards as calendar's L).
  The panel is a right-side drawer, not a chat-sidebar tab; i18n keys live under `npcChat`.
- Shop NPCs open `NpcChat/ShopPanel.svelte` (same right-side drawer, `Services/shop.ts`
  store): Bram/Nell catalogs with buy, Rilla sell-back, Moss reroll, Sable market stock
  with a closing countdown — Sable's entity only exists while `/api/game/market/status`
  says open (GameScene re-checks every 30s). Potions show a Use action.
- Leaderboard boards also arrive as NPC entities with `kind: "board"` (`Services/leaderboard.ts`,
  `GET /api/game/boards`); the sprite is `resources/npcs/board.png`. Click or X opens
  `NpcChat/LeaderboardPanel.svelte` with the board's period/metric ranking only when the
  player is in range (X prefers a nearer NPC).
- `Services/presenceHeartbeat.ts` (started in MainLayout) posts `/api/session/heartbeat` every
  60s and `/api/session/leave` on `pagehide`; core turns that into the presence audit.
- The game panel (`Components/GamePanel/`) is a chat-sidebar component tab, not a drawer:
  `sidebar.ts` opens it, remembers the open/closed choice in `localStorage["wa-game-panel-open"]`,
  and `restoreGamePanel()` (MainLayout onMount) opens it by default on join. It shows quests
  (`Services/quests.ts`, claim), achievements and the leaderboard list. The action bar's Tools
  menu (MapSubMenuContent) toggles it.
- Trade (`Components/Trade/TradePanel.svelte`, `Services/trade.ts`) is a right-side drawer fed by
  a 5s poll (`startTradePolling` in MainLayout). Entry point is the user-list action menu, which
  invites by Matrix handle; the game service resolves the handle back to a player email. Offers
  are item stacks + gold, both sides confirm, and the swap runs atomically in the game service.
- Match the translation import style and UI patterns of neighboring components.
- Event listeners and subscriptions must have explicit cleanup. ESLint checks listener removal and ignored subscriptions.
- For Phaser or media behavior, test actual runtime state rather than relying only on rendered DOM state.

## Related guides

- `../docs/agent/testing-vitest.md`
- `../docs/agent/svelte.md`
- `../docs/agent/i18n.md`
- `../docs/agent/typescript-style.md`
- `../docs/agent/devtools.md`
