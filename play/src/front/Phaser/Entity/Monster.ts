import * as Phaser from "phaser";
import type { MonsterCommand } from "../../Api/Events/MonsterEvent";
import type { NpcInfo } from "../../Enum/Npc";
import { playSfx } from "../../Services/gameSfx";
import { UsernameDisplay } from "../Components/UsernameDisplay";
import { npcRoleIconHtml } from "../Components/npcRoleIcons";
import type { GameScene } from "../Game/GameScene";

import Container = Phaser.GameObjects.Container;
import Graphics = Phaser.GameObjects.Graphics;

const FRAME_SIZE = 32;
const MOVE_SPEED = 64;
const BAR_WIDTH = 28;
const NPC_BADGE_OFFSET = 26;
const NPC_BADGE_ICON_SIZE = 13;

/**
 * A monster (or NPC) rendered natively by the game: a spritesheet entity with a
 * nameplate, a health bar and smooth movement toward the position the map script
 * asks for. Every hit spawns a floating damage number plus a white flash, a sprite
 * shake and a thud. NPCs carry the
 * player-style name badge with a role icon instead of a text nameplate, and a
 * click walks the player over and opens their panel.
 */
export class Monster extends Container {
    private readonly sprite: Phaser.GameObjects.Sprite;
    private readonly hpBar: Graphics;
    private readonly stepListener: (time: number, delta: number) => void;
    private readonly usernameDisplay?: UsernameDisplay;
    private readonly npc?: NpcInfo;
    private target: { x: number; y: number };
    private hp: number;
    private maxHp: number;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        textureKey: string,
        frameStart = 0,
        name?: string,
        hp = 0,
        maxHp = 0,
        npc?: NpcInfo,
    ) {
        super(scene, x, y);

        this.hp = hp;
        this.maxHp = maxHp;
        this.target = { x, y };
        this.npc = npc;

        this.sprite = scene.add.sprite(0, 0, textureKey, frameStart).setOrigin(0.5, 0.5);
        // NPCs and boards stand still: only monsters get the two-frame idle cycle.
        if (!npc) {
            const idleAnim = `${textureKey}-${frameStart}-idle`;
            if (!scene.anims.exists(idleAnim)) {
                scene.anims.create({
                    key: idleAnim,
                    frames: scene.anims.generateFrameNumbers(textureKey, {
                        start: frameStart,
                        end: frameStart + 1,
                    }),
                    frameRate: 3,
                    repeat: -1,
                });
            }
            this.sprite.play(idleAnim);
        }
        this.add(this.sprite);

        this.hpBar = scene.add.graphics();
        this.add(this.hpBar);

        if (npc) {
            // Boards carry no name badge and use their own large frame size.
            if (npc.kind === "board") {
                this.sprite.setOrigin(0.5, 0.75);
            } else if (name) {
                this.usernameDisplay = new UsernameDisplay(
                    scene as unknown as GameScene,
                    x,
                    y - NPC_BADGE_OFFSET,
                    name,
                    undefined,
                    npcRoleIconHtml(npc.icon, NPC_BADGE_ICON_SIZE),
                );
            }
            this.setSize(32, 64);
            this.setInteractive(
                npc.kind === "board"
                    ? new Phaser.Geom.Rectangle(-48, -50, 96, 66)
                    : new Phaser.Geom.Rectangle(-16, -48, 32, 64),
                Phaser.Geom.Rectangle.Contains, // eslint-disable-line @typescript-eslint/unbound-method
            );
            this.on(Phaser.Input.Events.POINTER_DOWN, () => {
                if (this.npc) (this.scene as unknown as GameScene).onNpcClicked(this.npc);
            });
        } else if (name) {
            const nameplate = scene.add
                .text(0, -40, name, {
                    fontSize: "11px",
                    color: "#ffffff",
                    backgroundColor: "#00000088",
                    padding: { x: 3, y: 1 },
                })
                .setOrigin(0.5, 0.5);
            this.add(nameplate);
        }

        this.drawHpBar();
        this.setDepth(y);

        this.stepListener = this.step.bind(this);
        this.scene.events.addListener("update", this.stepListener);
        scene.add.existing(this);
    }

    public setTarget(x: number, y: number): void {
        this.target = { x, y };
    }

    public setHp(hp: number, maxHp?: number): void {
        this.hp = hp;
        if (maxHp !== undefined) {
            this.maxHp = maxHp;
        }
        this.drawHpBar();
    }

    public damage(amount: number): void {
        this.setHp(Math.max(this.hp - amount, 0));
        this.showDamage(amount);
        playSfx("hit");
        this.sprite.setTintFill();
        this.scene.time.delayedCall(90, () => {
            if (this.sprite.active) this.sprite.clearTint();
        });
        this.scene.tweens.add({ targets: this.sprite, x: { from: -2, to: 0 }, duration: 140 });
    }

    private showDamage(amount: number): void {
        const text = this.scene.add
            .text(this.x, this.y - 24, `-${Math.round(amount)}`, {
                fontSize: "14px",
                color: "#ffd23f",
                stroke: "#000000",
                strokeThickness: 3,
            })
            .setOrigin(0.5, 0.5)
            .setDepth(100000);

        this.scene.tweens.add({
            targets: text,
            y: text.y - 28,
            alpha: 0,
            duration: 700,
            onComplete: () => text.destroy(),
        });
    }

    private drawHpBar(): void {
        this.hpBar.clear();
        if (this.maxHp <= 0) {
            return;
        }

        const ratio = Math.max(0, Math.min(1, this.hp / this.maxHp));
        const x = -BAR_WIDTH / 2;
        const y = -26;

        this.hpBar.fillStyle(0x000000, 0.6).fillRect(x - 1, y - 1, BAR_WIDTH + 2, 6);
        this.hpBar.fillStyle(ratio > 0.5 ? 0x4caf50 : ratio > 0.2 ? 0xffc107 : 0xf44336, 1);
        this.hpBar.fillRect(x, y, BAR_WIDTH * ratio, 4);
    }

    private step(time: number, delta: number): void {
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const distance = Math.hypot(dx, dy);
        const travel = (MOVE_SPEED * delta) / 1000;

        if (distance <= travel) {
            this.setPosition(this.target.x, this.target.y);
            return;
        }

        this.setPosition(this.x + (dx / distance) * travel, this.y + (dy / distance) * travel);
        this.sprite.setFlipX(dx < 0);
        this.setDepth(this.y);
        this.usernameDisplay?.setPosition(this.x, this.y - NPC_BADGE_OFFSET);
    }

    public destroy(): void {
        if (this.scene) {
            this.scene.events.removeListener("update", this.stepListener);
        }
        this.usernameDisplay?.destroy();
        super.destroy();
    }
}

/**
 * Owns every native monster on the map for one scene: loads spritesheets on demand
 * and applies the commands a map script sends through `WA.monsters.*`.
 */
export class MonsterManager {
    private readonly monsters = new Map<string, Monster>();
    private readonly textureKeys = new Map<string, string>();
    private readonly texturePromises = new Map<string, Promise<string>>();
    private textureKeySeq = 0;

    constructor(private readonly scene: Phaser.Scene) {
        this.scene.events.once("shutdown", () => this.destroy());
    }

    public handle(command: MonsterCommand): void {
        switch (command.op) {
            case "spawn":
                this.spawn(
                    command.id,
                    command.x,
                    command.y,
                    command.textureUrl,
                    command.frameStart ?? 0,
                    command.name,
                    command.hp,
                    command.maxHp,
                    command.npc,
                ).catch((reason) => console.warn(`Could not spawn monster ${command.id}`, reason));
                break;
            case "move":
                this.monsters.get(command.id)?.setTarget(command.x, command.y);
                break;
            case "hp":
                this.monsters.get(command.id)?.setHp(command.hp, command.maxHp);
                break;
            case "damage":
                this.monsters.get(command.id)?.damage(command.amount);
                break;
            case "remove":
                this.remove(command.id);
                break;
        }
    }

    private async spawn(
        id: string,
        x: number,
        y: number,
        textureUrl: string,
        frameStart: number,
        name?: string,
        hp = 0,
        maxHp = 0,
        npc?: NpcInfo,
    ): Promise<void> {
        const textureKey = await this.loadTexture(textureUrl);
        if (!textureKey || !this.scene.scene.isActive()) {
            return;
        }
        this.remove(id);
        this.monsters.set(id, new Monster(this.scene, x, y, textureKey, frameStart, name, hp, maxHp, npc));
    }

    private remove(id: string): void {
        const monster = this.monsters.get(id);
        this.monsters.delete(id);
        if (!monster) return;
        if (this.scene.scene.isActive()) {
            this.scene.tweens.add({
                targets: monster,
                scale: 0.2,
                alpha: 0,
                duration: 160,
                onComplete: () => monster.destroy(),
            });
        } else {
            monster.destroy();
        }
    }

    private loadTexture(textureUrl: string): Promise<string> {
        const existing = this.textureKeys.get(textureUrl);
        if (existing && this.scene.textures.exists(existing)) {
            return Promise.resolve(existing);
        }
        // Concurrent spawns must share one load per URL; the key is reserved up front so
        // two different URLs loading in the same millisecond never collide.
        const pending = this.texturePromises.get(textureUrl);
        if (pending) return pending;
        if (!this.scene.scene.isActive()) {
            return Promise.resolve("");
        }

        const textureKey = `monster-${this.textureKeySeq++}`;
        const promise = new Promise<string>((resolve) => {
            const finish = (key: string) => {
                this.scene.load.off(Phaser.Loader.Events.COMPLETE, onComplete);
                this.scene.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, onError);
                this.scene.events.removeListener("shutdown", onShutdown);
                this.texturePromises.delete(textureUrl);
                resolve(key);
            };
            const fail = () => {
                console.warn(`Could not load monster spritesheet ${textureUrl}`);
                finish("");
            };
            const onComplete = () => {
                if (this.scene.textures.exists(textureKey)) {
                    this.textureKeys.set(textureUrl, textureKey);
                    finish(textureKey);
                } else {
                    fail();
                }
            };
            const onError = (file: Phaser.Loader.File) => {
                if (file.key === textureKey) fail();
            };
            const onShutdown = () => finish("");

            // The board art is one large 96x64 frame; every other sheet is 32x32.
            const boardFrame = textureUrl.includes("board.png");
            this.scene.load.spritesheet(textureKey, textureUrl, {
                frameWidth: boardFrame ? 96 : FRAME_SIZE,
                frameHeight: boardFrame ? 64 : FRAME_SIZE,
            });
            this.scene.load.on(Phaser.Loader.Events.COMPLETE, onComplete);
            this.scene.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, onError);
            this.scene.events.once("shutdown", onShutdown);
            if (!this.scene.load.isLoading()) {
                this.scene.load.start();
            }
        });
        this.texturePromises.set(textureUrl, promise);
        return promise;
    }

    private destroy(): void {
        for (const id of Array.from(this.monsters.keys())) {
            this.remove(id);
        }
    }
}
