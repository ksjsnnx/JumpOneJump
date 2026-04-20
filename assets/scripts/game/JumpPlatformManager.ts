import { Color, Node, Vec3 } from 'cc';

import { JUMP_GAME_CONFIG } from './JumpGameConfig';
import { randomRange } from './JumpGameMath';
import { PlatformData } from './JumpGameTypes';
import { JumpWorld } from './JumpWorld';

export class JumpPlatformManager {
    private readonly platforms: PlatformData[] = [];
    private currentPlatformCursor = 0;

    constructor(private readonly world: JumpWorld) {
    }

    get currentPlatform(): PlatformData | null {
        return this.platforms[this.currentPlatformCursor] ?? null;
    }

    get nextPlatform(): PlatformData | null {
        return this.platforms[this.currentPlatformCursor + 1] ?? null;
    }

    reset() {
        this.platforms.length = 0;
        this.currentPlatformCursor = 0;

        this.spawnStartPlatform();
        for (let i = 1; i < JUMP_GAME_CONFIG.initialPlatformCount; i += 1) {
            this.spawnNextPlatform();
        }
    }

    findLandingPlatform(position: Vec3): { platform: PlatformData | null; top: number } {
        let landingPlatform: PlatformData | null = null;
        let highestTop = Number.NEGATIVE_INFINITY;

        for (const platform of this.platforms) {
            if (!this.isInsidePlatform(position, platform)) {
                continue;
            }

            const top = this.getPlatformTop(platform);
            if (position.y <= top + 0.05 && top > highestTop) {
                landingPlatform = platform;
                highestTop = top;
            }
        }

        return {
            platform: landingPlatform,
            top: highestTop,
        };
    }

    getPlatformTop(platform: PlatformData | null): number {
        if (!platform) {
            return 0;
        }
        return platform.center.y + platform.size.y * 0.5;
    }

    advancePath() {
        this.currentPlatformCursor += 1;

        while (this.platforms.length - this.currentPlatformCursor < JUMP_GAME_CONFIG.platformReserveCount) {
            this.spawnNextPlatform();
        }

        while (this.currentPlatformCursor > 2) {
            const removed = this.platforms.shift();
            removed?.node.destroy();
            this.currentPlatformCursor -= 1;
        }
    }

    private spawnStartPlatform() {
        const size = new Vec3(4, 1.2, 4);
        const center = new Vec3(0, size.y * 0.5, 0);
        this.platforms.push(this.createPlatform(center, size, this.pickPlatformColor()));
    }

    private spawnNextPlatform() {
        const previous = this.platforms[this.platforms.length - 1];
        const axis = Math.random() > 0.5 ? 0 : 1;
        const direction = axis === 0 ? new Vec3(1, 0, 0) : new Vec3(0, 0, -1);
        const distance = randomRange(4.8, 7.2);
        const size = new Vec3(
            randomRange(2.7, 4.2),
            randomRange(0.8, 1.8),
            randomRange(2.7, 4.2),
        );
        const center = new Vec3(
            previous.center.x + direction.x * distance,
            size.y * 0.5,
            previous.center.z + direction.z * distance,
        );
        const color = this.pickPlatformColor(previous.color);
        this.platforms.push(this.createPlatform(center, size, color));
    }

    private pickPlatformColor(previousColor?: Color): Color {
        let color = JUMP_GAME_CONFIG.platformPalette[Math.floor(Math.random() * JUMP_GAME_CONFIG.platformPalette.length)];

        if (previousColor && JUMP_GAME_CONFIG.platformPalette.length > 1) {
            let attempts = 0;
            while (this.isSameColor(color, previousColor) && attempts < 8) {
                color = JUMP_GAME_CONFIG.platformPalette[Math.floor(Math.random() * JUMP_GAME_CONFIG.platformPalette.length)];
                attempts += 1;
            }
        }

        return new Color(color.r, color.g, color.b, color.a);
    }

    private isSameColor(a: Color, b: Color): boolean {
        return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
    }

    private createPlatform(center: Vec3, size: Vec3, color: Color): PlatformData {
        const node = this.world.createPlatform(this.platforms.length, center, size, color);
        return {
            node,
            center: center.clone(),
            size: size.clone(),
            color: new Color(color.r, color.g, color.b, color.a),
        };
    }

    private isInsidePlatform(position: Vec3, platform: PlatformData): boolean {
        return Math.abs(position.x - platform.center.x) <= platform.size.x * 0.5
            && Math.abs(position.z - platform.center.z) <= platform.size.z * 0.5;
    }
}
