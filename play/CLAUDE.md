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
  The profile menu's Inventory entry (`Components/Inventory/sidebar.ts`) opens a
  `GameWindow/FloatingWindow` instead (`inventoryOpenStore`; `openInventory()` also closes
  the NPC panels so two windows never stack).
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
  replaced by a 16px role icon (`Phaser/Components/npcRoleIcons.ts` — PNGs at
  `public/resources/icons/npc-<name>.png`, painted with `currentColor` through a CSS mask so
  each context keeps its theme color). NPCs stand still — only
  monsters play the two-frame idle anim — and `MonsterManager.loadTexture` reserves a unique
  key per URL load (a shared key once made every NPC render the first sprite). Clicking one walks the player
  to an adjacent tile (`GameScene.onNpcClicked`) and opens `NpcChat/NpcChatPanel.svelte` on
  arrival; **X** opens the nearest NPC within 120px (same focus/input guards as calendar's L). Opening a chat seeds the NPC's `greeting` (from `GET /api/game/npc/list`) as the
  first NPC message, so every conversation starts with what you can ask that NPC about.
  **Every fixed overlay must carry `pointer-events-auto`** (RpgDialog, FloatingWindow, GamePanel, TradePanel): the MainLayout root is `pointer-events-none`, and without the
  class every click falls through to the game canvas — the panel renders but nothing responds, which reads as a freeze.
  The chat panel is a centered modal built on `NpcChat/RpgDialog.svelte` (pixel-JRPG theme:
  navy frame, pop-yellow accents, dimmed backdrop; the player's own lines are parchment
  bubbles) — not a drawer, not a chat-sidebar tab; i18n keys live under `npcChat`. Shop,
  leaderboard and inventory use `GameWindow/FloatingWindow` instead (right-anchored cards,
  no backdrop).
- Shop NPCs open `NpcChat/ShopPanel.svelte` as a wide `GameWindow/FloatingWindow` laid out
  like a craft station (`Services/shop.ts` store): left parchment slot grid of pixel icons
  (`Inventory/items.ts` `iconUrl`), middle pane with the per-shop station glyph + the
  primary action (BUY/SELL/REROLL/USE, green CREATE-style button), right DESCRIPTION
  parchment with stats as `◆` lines — Bram/Nell catalogs, Rilla sell-back, Moss reroll
  shows `◆ +roll` / `◆ max +rollMax`, Sable market stock with a closing countdown (its
  entity only exists while `/api/game/market/status` says open, re-checked every 30s).
- Leaderboard boards also arrive as NPC entities with `kind: "board"` (`Services/leaderboard.ts`,
  `GET /api/game/boards`); the sprite is `resources/npcs/board.png`. Click or X opens
  `NpcChat/LeaderboardPanel.svelte` (a `FloatingWindow`): the board never reveals its metric
  or scores — the header shows a per-metric riddle and every score renders `??`, only the
  ranking is real. Opens only when the player is in range (X prefers a nearer NPC).
- `Services/presenceHeartbeat.ts` (started in MainLayout) posts `/api/session/heartbeat` every
  60s and `/api/session/leave` on `pagehide`; core turns that into the presence audit.
- The game panel (`Components/GamePanel/`) is a standalone fixed tracker on the right edge
  at `top-24` (the top-16 slot collides with the Tools/Share/user-menu header row),
  not a chat-sidebar tab: `sidebar.ts` exports `gamePanelOpenStore` (open/closed persists in
  `localStorage["wa-game-panel-open"]`; `restoreGamePanel()` on MainLayout onMount opens it by
  default), and MainLayout renders `<GamePanel />` directly. Collapsed it shows active quest
  progress; expanded it tabs quests + achievements (`Services/quests.ts`, claim) — ornate
  styling: gold border with corner studs, mono gold headers, purple→gold gradient progress
  bars, gold CLAIM buttons, emerald tint on ready quests. Leaderboards are not in it —
  boards are walk-to map objects only. The action bar's Tools menu (MapSubMenuContent)
  toggles it.
- Game feel (`Services/gameSfx.ts`): synthesized WebAudio chiptune effects, no audio files —
  `playSfx(name)` for open/close blips (RpgDialog, FloatingWindow, GamePanel toggle), a quiet
  global button tick (document capture listener installed in MainLayout with matching
  cleanup), NPC click pop, chat greeting ding, claim fanfare, coin for buy/sell, ding for
  reroll/use, and a thud on monster hits. Combat VFX live in `Phaser/Entity/Monster.ts`
  (floating damage number, white flash, sprite shake, scale-out on remove); shop actions
  burst the slot (`slot-burst`) and pop the gold chip (`gold-pop`) in `ShopPanel.svelte`.
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
