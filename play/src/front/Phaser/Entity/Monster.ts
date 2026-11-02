import * as Phaser from "phaser";
import type { MonsterCommand } from "../../Api/Events/MonsterEvent";

import Container = Phaser.GameObjects.Container;
import Graphics = Phaser.GameObjects.Graphics;

const FRAME_SIZE = 32;
const MOVE_SPEED = 64;
const BAR_WIDTH = 28;

/**
 * A monster (or NPC) rendered natively by the game: a spritesheet entity with a
 * nameplate, a health bar and smooth movement toward the position the map script
 * asks for. Floating damage numbers are spawned on every hit.
 */
export class Monster extends Container {
    private readonly sprite: Phaser.GameObjects.Sprite;
    private readonly hpBar: Graphics;
    private readonly stepListener: (time: number, delta: number) => void;
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
    ) {
        super(scene, x, y);

        this.hp = hp;
        this.maxHp = maxHp;
        this.target = { x, y };

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

        this.sprite = scene.add.sprite(0, 0, textureKey, frameStart).setOrigin(0.5, 0.5);
        this.sprite.play(idleAnim);
        this.add(this.sprite);

        this.hpBar = scene.add.graphics();
        this.add(this.hpBar);

        if (name) {
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
    }

    public destroy(): void {
        if (this.scene) {
            this.scene.events.removeListener("update", this.stepListener);
        }
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
    ): Promise<void> {
        const textureKey = await this.loadTexture(textureUrl);
        if (!textureKey || !this.scene.scene.isActive()) {
            return;
        }
        this.remove(id);
        this.monsters.set(id, new Monster(this.scene, x, y, textureKey, frameStart, name, hp, maxHp));
    }

    private remove(id: string): void {
        this.monsters.get(id)?.destroy();
        this.monsters.delete(id);
    }

    private loadTexture(textureUrl: string): Promise<string> {
        const existing = this.textureKeys.get(textureUrl);
        if (existing && this.scene.textures.exists(existing)) {
            return Promise.resolve(existing);
        }

        const textureKey = `monster-${this.textureKeys.size}-${Date.now()}`;
        return new Promise<string>((resolve) => {
            this.scene.load.spritesheet(textureKey, textureUrl, {
                frameWidth: FRAME_SIZE,
                frameHeight: FRAME_SIZE,
            });
            this.scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
                if (this.scene.textures.exists(textureKey)) {
                    this.textureKeys.set(textureUrl, textureKey);
                    resolve(textureKey);
                } else {
                    console.warn(`Could not load monster spritesheet ${textureUrl}`);
                    resolve("");
                }
            });
            if (!this.scene.load.isLoading()) {
                this.scene.load.start();
            }
        });
    }

    private destroy(): void {
        for (const id of Array.from(this.monsters.keys())) {
            this.remove(id);
        }
    }
}
