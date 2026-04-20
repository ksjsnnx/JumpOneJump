import {
    _decorator,
    Camera,
    Component,
    EventMouse,
    EventTouch,
    Input,
    Vec3,
    director,
    input,
} from 'cc';

import { JUMP_GAME_CONFIG, JUMP_GAME_TEXT } from './game/JumpGameConfig';
import { clamp01, lerp } from './game/JumpGameMath';
import { GameState, PlatformData } from './game/JumpGameTypes';
import { JumpPlatformManager } from './game/JumpPlatformManager';
import { JumpUIController } from './game/JumpUIController';
import { JumpWebSupport } from './game/JumpWebSupport';
import { JumpWorld } from './game/JumpWorld';

const { ccclass } = _decorator;

@ccclass('JumpOneGame')
export class JumpOneGame extends Component {
    private cameraComp: Camera | null = null;

    private readonly world = new JumpWorld();
    private readonly ui = new JumpUIController();
    private readonly webSupport = new JumpWebSupport();
    private readonly jumpDirection = new Vec3();
    private readonly cameraFocus = new Vec3();
    private readonly desiredCameraFocus = new Vec3();

    private platformManager: JumpPlatformManager | null = null;
    private state: GameState = 'ready';
    private score = 0;
    private chargeTime = 0;
    private horizontalSpeed = 0;
    private verticalSpeed = 0;
    private deathSpeed = 0;
    private inputHeld = false;
    private restartTimer = 0;

    onLoad() {
        this.cameraComp = this.getComponent(Camera);
        if (!this.cameraComp) {
            console.error('[JumpOneGame] Camera component is missing.');
            return;
        }

        const scene = director.getScene();
        if (!scene) {
            console.error('[JumpOneGame] Scene is missing.');
            return;
        }

        this.world.initialize(scene, this.cameraComp, this.node);
        this.ui.initialize(scene);
        this.webSupport.initialize((viewport) => {
            this.ui.refreshLayout(viewport);
        });
        this.platformManager = new JumpPlatformManager(this.world);

        this.bindInput();
        this.resetGame();
    }

    onDestroy() {
        this.webSupport.dispose();
        input.off(Input.EventType.TOUCH_START, this.onTouchStart, this);
        input.off(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        input.off(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
        input.off(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
        input.off(Input.EventType.MOUSE_UP, this.onMouseUp, this);
    }

    update(dt: number) {
        this.updateChargingVisual(dt);
        this.updateJumping(dt);
        this.updateCamera(dt);
        this.ui.update(dt);
        this.updateAutoRestart(dt);
    }

    private bindInput() {
        input.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
        input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        input.on(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
        input.on(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
        input.on(Input.EventType.MOUSE_UP, this.onMouseUp, this);
    }

    private onTouchStart(_event: EventTouch) {
        this.beginCharge();
    }

    private onTouchEnd(_event: EventTouch) {
        this.releaseCharge();
    }

    private onMouseDown(event: EventMouse) {
        if (event.getButton() !== 0) {
            return;
        }
        this.beginCharge();
    }

    private onMouseUp(event: EventMouse) {
        if (event.getButton() !== 0) {
            return;
        }
        this.releaseCharge();
    }

    private beginCharge() {
        if (this.inputHeld || this.state === 'gameover' || this.state !== 'ready') {
            return;
        }

        this.inputHeld = true;
        this.state = 'charging';
        this.chargeTime = 0;
        this.ui.setHint(JUMP_GAME_TEXT.releaseHint);
    }

    private releaseCharge() {
        if (!this.inputHeld) {
            return;
        }

        this.inputHeld = false;

        if (this.state !== 'charging' || !this.platformManager) {
            return;
        }

        const currentPlatform = this.platformManager.currentPlatform;
        const nextPlatform = this.platformManager.nextPlatform;
        if (!currentPlatform || !nextPlatform) {
            return;
        }

        const ratio = clamp01(this.chargeTime / JUMP_GAME_CONFIG.maxChargeTime);
        const easedRatio = Math.pow(ratio, 0.9);
        const desiredDistance = lerp(
            JUMP_GAME_CONFIG.minJumpDistance,
            JUMP_GAME_CONFIG.maxJumpDistance,
            easedRatio,
        );
        const estimatedFlightTime = (JUMP_GAME_CONFIG.jumpVerticalSpeed * 2) / JUMP_GAME_CONFIG.gravity;

        this.horizontalSpeed = desiredDistance / estimatedFlightTime;
        this.verticalSpeed = JUMP_GAME_CONFIG.jumpVerticalSpeed;
        this.deathSpeed = 0;
        this.state = 'jumping';

        const direction = new Vec3(
            nextPlatform.center.x - currentPlatform.center.x,
            0,
            nextPlatform.center.z - currentPlatform.center.z,
        );
        direction.normalize();
        this.jumpDirection.set(direction.x, direction.y, direction.z);

        this.ui.setHint(JUMP_GAME_TEXT.observeHint);
    }

    private resetGame() {
        if (!this.platformManager) {
            return;
        }

        this.world.resetPlatforms();
        this.platformManager.reset();

        this.score = 0;
        this.resetJumpMotion();
        this.inputHeld = false;
        this.state = 'ready';
        this.restartTimer = 0;

        const currentPlatform = this.platformManager.currentPlatform;
        const startTop = this.platformManager.getPlatformTop(currentPlatform);
        if (currentPlatform) {
            this.world.placeCharacter(new Vec3(currentPlatform.center.x, startTop, currentPlatform.center.z));
        }
        this.world.setCharacterScale(1, 1, 1);

        this.updateCharacterFacing();
        this.updateCameraTarget(true);
        this.ui.reset();
    }

    private updateChargingVisual(dt: number) {
        const characterVisual = this.world.characterVisual;
        if (!characterVisual) {
            return;
        }

        if (this.state === 'charging' && this.inputHeld) {
            this.chargeTime = Math.min(JUMP_GAME_CONFIG.maxChargeTime, this.chargeTime + dt);
            const ratio = clamp01(this.chargeTime / JUMP_GAME_CONFIG.maxChargeTime);
            const squashX = 1 + ratio * 0.2;
            const squashY = 1 - ratio * 0.38;
            this.world.setCharacterScale(squashX, squashY, squashX);
            this.ui.setHint(`${JUMP_GAME_TEXT.chargingPrefix} ${Math.round(ratio * 100)}%`);
            return;
        }

        this.world.setCharacterScale(1, 1, 1);
    }

    private updateJumping(dt: number) {
        const characterRoot = this.world.characterRoot;
        if (!characterRoot) {
            return;
        }

        const position = characterRoot.position.clone();

        if (this.state === 'jumping') {
            position.x += this.jumpDirection.x * this.horizontalSpeed * dt;
            position.z += this.jumpDirection.z * this.horizontalSpeed * dt;

            this.verticalSpeed -= JUMP_GAME_CONFIG.gravity * dt;
            position.y += this.verticalSpeed * dt;
            this.world.placeCharacter(position);

            if (this.tryLand(position)) {
                return;
            }

            if (position.y < JUMP_GAME_CONFIG.maxFallHeight) {
                this.enterGameOver();
            }
            return;
        }

        if (this.state === 'gameover') {
            this.deathSpeed -= JUMP_GAME_CONFIG.gravity * dt;
            position.y += this.deathSpeed * dt;
            this.world.placeCharacter(position);
        }
    }

    private tryLand(position: Vec3): boolean {
        if (this.verticalSpeed > 0 || !this.platformManager) {
            return false;
        }

        const landing = this.platformManager.findLandingPlatform(position);
        if (!landing.platform) {
            return false;
        }

        this.world.placeCharacter(new Vec3(position.x, landing.top, position.z));

        if (landing.platform === this.platformManager.nextPlatform) {
            this.onLandNextPlatform(position, landing.platform);
        } else {
            this.onLandCurrentPlatform();
        }

        return true;
    }

    private onLandCurrentPlatform() {
        this.state = 'ready';
        this.resetJumpMotion();
        this.updateCameraTarget(false);
        this.ui.setHint(JUMP_GAME_TEXT.continueChargeHint);
    }

    private onLandNextPlatform(position: Vec3, nextPlatform: PlatformData) {
        const dx = position.x - nextPlatform.center.x;
        const dz = position.z - nextPlatform.center.z;
        const distanceToCenter = Math.sqrt(dx * dx + dz * dz);
        const perfectThreshold = Math.min(nextPlatform.size.x, nextPlatform.size.z) * JUMP_GAME_CONFIG.perfectLandingRatio;
        const bonus = distanceToCenter <= perfectThreshold ? 2 : 1;

        this.score += bonus;
        this.ui.setScore(this.score);

        if (bonus === 2) {
            this.ui.showStatus(JUMP_GAME_TEXT.perfectStatus, JUMP_GAME_CONFIG.perfectStatusColor, 0.9);
        }

        this.platformManager?.advancePath();
        this.state = 'ready';
        this.resetJumpMotion();
        this.updateCharacterFacing();
        this.updateCameraTarget(false);
        this.ui.setHint(JUMP_GAME_TEXT.nextJumpHint);
    }

    private enterGameOver() {
        if (this.state === 'gameover') {
            return;
        }

        this.state = 'gameover';
        this.inputHeld = false;
        this.chargeTime = 0;
        this.deathSpeed = this.verticalSpeed;
        this.restartTimer = JUMP_GAME_CONFIG.restartDelay;

        this.ui.showStatus(
            JUMP_GAME_TEXT.gameOverStatus,
            JUMP_GAME_CONFIG.gameOverStatusColor,
            JUMP_GAME_CONFIG.restartDelay,
            false,
            true,
        );
        this.ui.setHint(JUMP_GAME_TEXT.restartingHint);
    }

    private updateCameraTarget(immediate: boolean) {
        if (!this.platformManager?.currentPlatform || !this.platformManager.nextPlatform) {
            return;
        }

        this.desiredCameraFocus.set(
            (this.platformManager.currentPlatform.center.x + this.platformManager.nextPlatform.center.x) * 0.5,
            JUMP_GAME_CONFIG.cameraFocusHeight,
            (this.platformManager.currentPlatform.center.z + this.platformManager.nextPlatform.center.z) * 0.5,
        );

        if (immediate) {
            this.cameraFocus.set(
                this.desiredCameraFocus.x,
                this.desiredCameraFocus.y,
                this.desiredCameraFocus.z,
            );
            this.applyCameraPosition(this.cameraFocus);
        }
    }

    private updateCamera(dt: number) {
        const ratio = Math.min(1, dt * JUMP_GAME_CONFIG.cameraSmooth);
        this.cameraFocus.set(
            lerp(this.cameraFocus.x, this.desiredCameraFocus.x, ratio),
            lerp(this.cameraFocus.y, this.desiredCameraFocus.y, ratio),
            lerp(this.cameraFocus.z, this.desiredCameraFocus.z, ratio),
        );

        this.applyCameraPosition(this.cameraFocus);
    }

    private applyCameraPosition(focus: Vec3) {
        this.node.setPosition(
            focus.x + JUMP_GAME_CONFIG.cameraOffset.x,
            focus.y + JUMP_GAME_CONFIG.cameraOffset.y,
            focus.z + JUMP_GAME_CONFIG.cameraOffset.z,
        );
    }

    private updateCharacterFacing() {
        if (!this.platformManager?.currentPlatform || !this.platformManager.nextPlatform) {
            return;
        }

        const directionX = this.platformManager.nextPlatform.center.x - this.platformManager.currentPlatform.center.x;
        const directionZ = this.platformManager.nextPlatform.center.z - this.platformManager.currentPlatform.center.z;
        const angleY = Math.atan2(directionX, directionZ) * 180 / Math.PI;
        this.world.setCharacterFacing(angleY);
    }

    private updateAutoRestart(dt: number) {
        if (this.restartTimer <= 0) {
            return;
        }

        this.restartTimer -= dt;
        if (this.restartTimer <= 0) {
            this.resetGame();
        }
    }

    private resetJumpMotion() {
        this.chargeTime = 0;
        this.horizontalSpeed = 0;
        this.verticalSpeed = 0;
        this.deathSpeed = 0;
    }
}
