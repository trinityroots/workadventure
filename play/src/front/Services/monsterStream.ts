import type { MonsterCommand } from "../Api/Events/MonsterEvent";
import { CORE_URL } from "../Enum/EnvironmentVariable";
import { sessionToken } from "./adminFetch";

/** A live monster as the game service reports it. */
export interface MonsterSnapshot {
    id: string;
    x: number;
    y: number;
    name: string;
    sprite: string;
    hp: number;
    maxHp: number;
}

interface AttackResult {
    hp: number;
    maxHp: number;
    status: string;
    damage: number;
}

const TEXTURE_PATH = "tilesets/WA_Monsters.png";
// WA_Monsters.png holds two 32x32 frames per monster, in this order.
const FRAME_START: Record<string, number> = { slime: 0, goblin: 2, bat: 4 };
/** One map tile — attacks only land from adjacent. */
export const ATTACK_DISTANCE = 32;
const ATTACK_COOLDOWN_MS = 500;
const CORPSE_DELAY_MS = 400;

export function nearestWithin(
    monsters: readonly MonsterSnapshot[],
    x: number,
    y: number,
    maxDistance: number,
): MonsterSnapshot | null {
    let best: MonsterSnapshot | null = null;
    let bestDistance = maxDistance;
    for (const monster of monsters) {
        const distance = Math.hypot(monster.x - x, monster.y - y);
        if (distance <= bestDistance) {
            best = monster;
            bestDistance = distance;
        }
    }
    return best;
}

/** The commands that bring the rendered monsters from `previous` to `snapshot`. */
export function monsterSnapshotCommands(
    previous: ReadonlyMap<string, MonsterSnapshot>,
    snapshot: readonly MonsterSnapshot[],
    textureUrl: string,
): MonsterCommand[] {
    const commands: MonsterCommand[] = [];
    const seen = new Set<string>();
    for (const monster of snapshot) {
        seen.add(monster.id);
        const last = previous.get(monster.id);
        if (!last) {
            commands.push({
                op: "spawn",
                id: monster.id,
                x: monster.x,
                y: monster.y,
                name: monster.name,
                hp: monster.hp,
                maxHp: monster.maxHp,
                textureUrl,
                frameStart: FRAME_START[monster.sprite] ?? 0,
            });
            continue;
        }
        if (last.x !== monster.x || last.y !== monster.y) {
            commands.push({ op: "move", id: monster.id, x: monster.x, y: monster.y });
        }
        if (last.hp !== monster.hp || last.maxHp !== monster.maxHp) {
            commands.push({ op: "hp", id: monster.id, hp: monster.hp, maxHp: monster.maxHp });
        }
    }
    for (const id of previous.keys()) {
        if (!seen.has(id)) {
            commands.push({ op: "remove", id });
        }
    }
    return commands;
}

export interface MonsterStreamOptions {
    /** URL of the current map; the spritesheet sits next to it. */
    mapUrl: string;
    position: () => { x: number; y: number };
    onCommand: (command: MonsterCommand) => void;
}

interface ActiveStream extends MonsterStreamOptions {
    controller: AbortController;
    textureUrl: string;
    known: Map<string, MonsterSnapshot>;
    snapshot: MonsterSnapshot[];
    lastAttack: number;
    warned: boolean;
    retry?: ReturnType<typeof setTimeout>;
}

let active: ActiveStream | undefined;
let pendingRetry: ReturnType<typeof setTimeout> | undefined;
let tokenAttempts = 0;

// The room connection only carries userRoomToken once the join completes, and
// startMonsterStream runs right after the player is created — so wait for the
// token instead of giving up, or monsters never appear for the whole session.
const TOKEN_RETRY_MS = 500;
const TOKEN_RETRY_LIMIT = 40;
const RECONNECT_MS = 3000;

/** The snapshot carried by one `data:` block of the stream, if it carries one. */
export function monsterEventSnapshot(block: string): MonsterSnapshot[] | undefined {
    const data = block
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .join("");
    if (!data) return undefined;
    try {
        return JSON.parse(data) as MonsterSnapshot[];
    } catch {
        return undefined;
    }
}

async function readMonsterStream(
    body: ReadableStream<Uint8Array>,
    onSnapshot: (snapshot: MonsterSnapshot[]) => void,
): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    try {
        await pumpMonsterStream(reader, decoder, onSnapshot, "");
    } finally {
        reader.releaseLock();
    }
}

async function pumpMonsterStream(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    decoder: TextDecoder,
    onSnapshot: (snapshot: MonsterSnapshot[]) => void,
    buffer: string,
): Promise<void> {
    const { value, done } = await reader.read();
    if (done) return;
    buffer += decoder.decode(value, { stream: true });
    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
        const snapshot = monsterEventSnapshot(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        if (snapshot) onSnapshot(snapshot);
        boundary = buffer.indexOf("\n\n");
    }
    return pumpMonsterStream(reader, decoder, onSnapshot, buffer);
}

function scheduleReconnect(stream: ActiveStream): void {
    if (stream.controller.signal.aborted) return;
    stream.retry = setTimeout(() => {
        connectStream(stream).catch(() => undefined);
    }, RECONNECT_MS);
}

function clearDisconnected(stream: ActiveStream): void {
    stream.warned = false;
}

function warnDisconnected(stream: ActiveStream, error: unknown): void {
    if (stream.warned) return;
    stream.warned = true;
    console.warn("Monster stream disconnected, reconnecting", error);
}

// EventSource cannot send headers, and the core service authenticates the
// stream with Bearer only — so the stream is read as a plain fetch body.
async function connectStream(stream: ActiveStream): Promise<void> {
    const token = sessionToken();
    if (!token) {
        scheduleReconnect(stream);
        return;
    }
    try {
        const response = await fetch(`${CORE_URL}/api/game/monster/stream`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: stream.controller.signal,
        });
        if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
        clearDisconnected(stream);
        await readMonsterStream(response.body, (snapshot) => {
            for (const command of monsterSnapshotCommands(stream.known, snapshot, stream.textureUrl)) {
                stream.onCommand(command);
            }
            stream.known = new Map(snapshot.map((monster) => [monster.id, monster]));
            stream.snapshot = snapshot;
        });
    } catch (error) {
        if (stream.controller.signal.aborted) return;
        warnDisconnected(stream, error);
    }
    scheduleReconnect(stream);
}

/** Subscribes the signed-in player to the admin's monster feed for the rest of the session. */
export function startMonsterStream(options: MonsterStreamOptions): void {
    if (pendingRetry) {
        clearTimeout(pendingRetry);
        pendingRetry = undefined;
    }
    stopMonsterStream();
    if (!CORE_URL) return;
    const token = sessionToken();
    if (!token) {
        if (tokenAttempts >= TOKEN_RETRY_LIMIT) {
            tokenAttempts = 0;
            console.warn("Monster stream: no session token after waiting, monsters stay hidden");
            return;
        }
        tokenAttempts += 1;
        pendingRetry = setTimeout(() => {
            pendingRetry = undefined;
            startMonsterStream(options);
        }, TOKEN_RETRY_MS);
        return;
    }
    tokenAttempts = 0;

    const stream: ActiveStream = {
        ...options,
        controller: new AbortController(),
        textureUrl: new URL(TEXTURE_PATH, options.mapUrl).toString(),
        known: new Map(),
        snapshot: [],
        lastAttack: 0,
        warned: false,
    };
    active = stream;
    connectStream(stream).catch(() => undefined);
}

export function stopMonsterStream(): void {
    if (pendingRetry) {
        clearTimeout(pendingRetry);
        pendingRetry = undefined;
    }
    const stream = active;
    if (!stream) return;
    if (stream.retry) clearTimeout(stream.retry);
    stream.controller.abort();
    active = undefined;
}

/** Attacks the nearest live monster in range, as bound to the X key. */
export function attackNearestMonster(): void {
    const stream = active;
    if (!stream) return;
    const now = Date.now();
    if (now - stream.lastAttack < ATTACK_COOLDOWN_MS) return;
    const position = stream.position();
    const target = nearestWithin(stream.snapshot, position.x, position.y, ATTACK_DISTANCE);
    const token = sessionToken();
    if (!target || !token) return;
    stream.lastAttack = now;

    fetch(`${CORE_URL}/api/game/monster/${encodeURIComponent(target.id)}/attack`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
    })
        .then(async (response) => {
            if (!response.ok) return;
            const result = (await response.json()) as AttackResult;
            stream.onCommand({ op: "damage", id: target.id, amount: result.damage });
            const previous = stream.known.get(target.id);
            if (previous) {
                stream.known.set(target.id, { ...previous, hp: result.hp, maxHp: result.maxHp });
            }
            if (result.status === "dead") {
                stream.known.delete(target.id);
                setTimeout(() => stream.onCommand({ op: "remove", id: target.id }), CORPSE_DELAY_MS);
            }
        })
        .catch((error: unknown) => console.warn(`Could not attack monster ${target.id}`, error));
}
