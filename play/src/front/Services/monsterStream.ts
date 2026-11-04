import type { MonsterCommand } from "../Api/Events/MonsterEvent";
import { ADMIN_URL } from "../Enum/EnvironmentVariable";
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
const ATTACK_DISTANCE = 96;
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
    source: EventSource;
    textureUrl: string;
    known: Map<string, MonsterSnapshot>;
    snapshot: MonsterSnapshot[];
    lastAttack: number;
    warned: boolean;
    handleMessage: (event: Event) => void;
    handleError: () => void;
}

let active: ActiveStream | undefined;

/** Subscribes the signed-in player to the admin's monster feed for the rest of the session. */
export function startMonsterStream(options: MonsterStreamOptions): void {
    stopMonsterStream();
    if (!ADMIN_URL) return;
    const token = sessionToken();
    if (!token) return;

    const handleMessage = (event: Event) => {
        if (!(event instanceof MessageEvent)) return;
        const snapshot = JSON.parse(event.data) as MonsterSnapshot[];
        for (const command of monsterSnapshotCommands(stream.known, snapshot, stream.textureUrl)) {
            stream.onCommand(command);
        }
        stream.known = new Map(snapshot.map((monster) => [monster.id, monster]));
        stream.snapshot = snapshot;
    };
    const handleError = () => {
        // EventSource reconnects on its own: warn once instead of on every retry.
        if (stream.warned) return;
        stream.warned = true;
        console.warn("Monster stream disconnected, waiting for the browser to reconnect");
    };

    const stream: ActiveStream = {
        ...options,
        source: new EventSource(`${ADMIN_URL}/api/monsters/stream?token=${encodeURIComponent(token)}`),
        textureUrl: new URL(TEXTURE_PATH, options.mapUrl).toString(),
        known: new Map(),
        snapshot: [],
        lastAttack: 0,
        warned: false,
        handleMessage,
        handleError,
    };
    active = stream;

    stream.source.addEventListener("monsters", stream.handleMessage);
    stream.source.addEventListener("error", stream.handleError);
}

export function stopMonsterStream(): void {
    const stream = active;
    if (!stream) return;
    stream.source.removeEventListener("monsters", stream.handleMessage);
    stream.source.removeEventListener("error", stream.handleError);
    stream.source.close();
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

    fetch(`${ADMIN_URL}/api/monsters/${encodeURIComponent(target.id)}/attack`, {
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
