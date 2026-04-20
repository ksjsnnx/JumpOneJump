import {
    _decorator,
    Camera,
    Canvas,
    Color,
    Component,
    EventMouse,
    EventTouch,
    Graphics,
    Input,
    Label,
    Layers,
    Material,
    Mesh,
    MeshRenderer,
    Node,
    UITransform,
    Vec3,
    Widget,
    director,
    input,
    primitives,
    utils,
    view,
} from 'cc';

const { ccclass } = _decorator;

type GameState = 'ready' | 'charging' | 'jumping' | 'gameover';

interface PlatformData {
    node: Node;
    center: Vec3;
    size: Vec3;
    color: Color;
}

@ccclass('JumpOneGame')
export class JumpOneGame extends Component {
    private readonly gravity = 24;
    private readonly jumpVerticalSpeed = 9.4;
    private readonly maxChargeTime = 1.35;
    private readonly minJumpDistance = 2.1;
    private readonly maxJumpDistance = 8.4;
    private readonly cameraOffset = new Vec3(-12, 14, 12);
    private readonly cameraSmooth = 6;
    private readonly platformColors = [
        new Color(239, 131, 84, 255),
        new Color(106, 76, 147, 255),
        new Color(76, 201, 240, 255),
        new Color(144, 190, 109, 255),
        new Color(249, 199, 79, 255),
        new Color(249, 132, 74, 255),
    ];

    private cameraComp: Camera | null = null;
    private worldRoot: Node | null = null;
    private platformRoot: Node | null = null;
    private uiRoot: Node | null = null;
    private scoreLabel: Label | null = null;
    private hintLabel: Label | null = null;
    private statusLabel: Label | null = null;
    private statusPanel: Node | null = null;

    private boxMesh: Mesh | null = null;
    private cylinderMesh: Mesh | null = null;
    private sphereMesh: Mesh | null = null;

    private characterRoot: Node | null = null;
    private characterVisual: Node | null = null;

    private platforms: PlatformData[] = [];
    private currentPlatformCursor = 0;
    private currentPlatform: PlatformData | null = null;
    private nextPlatform: PlatformData | null = null;

    private state: GameState = 'ready';
    private score = 0;
    private chargeTime = 0;
    private jumpDirection = new Vec3();
    private horizontalSpeed = 0;
    private verticalSpeed = 0;
    private deathSpeed = 0;
    private inputHeld = false;

    private cameraFocus = new Vec3();
    private desiredCameraFocus = new Vec3();

    private statusPersistent = false;
    private statusTimer = 0;
    private restartTimer = 0;
    private readonly restartDelay = 1.6;

    onLoad() {
        this.cameraComp = this.getComponent(Camera);
        if (!this.cameraComp) {
            console.error('[JumpOneGame] Camera component is missing.');
            return;
        }

        this.buildMeshCache();
        this.setupSceneRoots();
        this.setupCamera();
        this.setupUI();
        this.bindInput();
        this.resetGame();
    }

    onDestroy() {
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
        this.updateStatus(dt);
        this.updateAutoRestart(dt);
    }

    private buildMeshCache() {
        this.boxMesh = utils.MeshUtils.createMesh(primitives.box());
        this.cylinderMesh = utils.MeshUtils.createMesh(primitives.cylinder(0.5, 0.5, 1));
        this.sphereMesh = utils.MeshUtils.createMesh(primitives.sphere(0.5));
    }

    private setupSceneRoots() {
        const scene = director.getScene();
        if (!scene) {
            return;
        }

        const oldWorld = scene.getChildByName('JumpOneWorld');
        if (oldWorld) {
            oldWorld.destroy();
        }

        const oldUi = scene.getChildByName('JumpOneUI');
        if (oldUi) {
            oldUi.destroy();
        }

        this.worldRoot = new Node('JumpOneWorld');
        this.worldRoot.layer = Layers.Enum.DEFAULT;
        scene.addChild(this.worldRoot);

        this.platformRoot = new Node('Platforms');
        this.platformRoot.layer = Layers.Enum.DEFAULT;
        this.worldRoot.addChild(this.platformRoot);

        this.characterRoot = new Node('PlayerRoot');
        this.characterRoot.layer = Layers.Enum.DEFAULT;
        this.worldRoot.addChild(this.characterRoot);

        this.characterVisual = new Node('PlayerVisual');
        this.characterVisual.layer = Layers.Enum.DEFAULT;
        this.characterRoot.addChild(this.characterVisual);

        this.buildCharacter();
        this.buildGround();
    }

    private setupCamera() {
        if (!this.cameraComp) {
            return;
        }

        this.cameraComp.projection = Camera.ProjectionType.ORTHO;
        this.cameraComp.orthoHeight = 9.5;
        this.cameraComp.clearFlags = Camera.ClearFlag.SOLID_COLOR;
        this.cameraComp.clearColor = new Color(244, 236, 229, 255);
        this.cameraComp.near = 0.1;
        this.cameraComp.far = 200;

        this.node.setRotationFromEuler(-35, -45, 0);
    }

    private setupUI() {
        const scene = director.getScene();
        if (!scene) {
            return;
        }

        this.uiRoot = new Node('JumpOneUI');
        this.uiRoot.layer = Layers.Enum.UI_2D;
        scene.addChild(this.uiRoot);

        const canvas = this.uiRoot.addComponent(Canvas);
        canvas.alignCanvasWithScreen = true;

        // Canvas may already inject UITransform on the same node in Creator.
        const transform = this.uiRoot.getComponent(UITransform) ?? this.uiRoot.addComponent(UITransform);
        transform.setContentSize(view.getVisibleSize());

        this.statusPanel = new Node('StatusPanel');
        this.statusPanel.layer = Layers.Enum.UI_2D;
        this.statusPanel.parent = this.uiRoot;
        const panelTransform = this.statusPanel.addComponent(UITransform);
        panelTransform.setContentSize(560, 220);
        const panelGraphics = this.statusPanel.addComponent(Graphics);
        panelGraphics.fillColor = new Color(37, 29, 24, 220);
        panelGraphics.roundRect(-280, -110, 560, 220, 24);
        panelGraphics.fill();
        panelGraphics.strokeColor = new Color(255, 132, 132, 255);
        panelGraphics.lineWidth = 4;
        panelGraphics.roundRect(-280, -110, 560, 220, 24);
        panelGraphics.stroke();
        this.statusPanel.active = false;
        const panelWidget = this.statusPanel.addComponent(Widget);
        panelWidget.isAlignHorizontalCenter = true;
        panelWidget.horizontalCenter = 0;
        panelWidget.isAlignVerticalCenter = true;
        panelWidget.verticalCenter = -10;

        this.scoreLabel = this.createLabel('ScoreLabel', 38, new Color(71, 58, 47, 255));
        this.scoreLabel.string = '得分 0';
        this.scoreLabel.node.parent = this.uiRoot;
        this.scoreLabel.node.layer = Layers.Enum.UI_2D;
        const scoreWidget = this.scoreLabel.node.addComponent(Widget);
        scoreWidget.isAlignTop = true;
        scoreWidget.isAlignLeft = true;
        scoreWidget.top = 28;
        scoreWidget.left = 28;

        this.hintLabel = this.createLabel('HintLabel', 26, new Color(104, 88, 75, 255));
        this.hintLabel.string = '长按屏幕或鼠标左键蓄力，松手起跳';
        this.hintLabel.node.parent = this.uiRoot;
        this.hintLabel.node.layer = Layers.Enum.UI_2D;
        const hintTransform = this.hintLabel.getComponent(UITransform);
        if (hintTransform) {
            hintTransform.setContentSize(820, 60);
        }
        this.hintLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        const hintWidget = this.hintLabel.node.addComponent(Widget);
        hintWidget.isAlignBottom = true;
        hintWidget.bottom = 34;
        hintWidget.isAlignHorizontalCenter = true;
        hintWidget.horizontalCenter = 0;

        this.statusLabel = this.createLabel('StatusLabel', 52, new Color(255, 255, 255, 255));
        this.statusLabel.node.parent = this.uiRoot;
        this.statusLabel.node.layer = Layers.Enum.UI_2D;
        const statusTransform = this.statusLabel.getComponent(UITransform);
        if (statusTransform) {
            statusTransform.setContentSize(520, 180);
        }
        this.statusLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        this.statusLabel.verticalAlign = Label.VerticalAlign.CENTER;
        this.statusLabel.node.active = false;
        const statusWidget = this.statusLabel.node.addComponent(Widget);
        statusWidget.isAlignHorizontalCenter = true;
        statusWidget.horizontalCenter = 0;
        statusWidget.isAlignVerticalCenter = true;
        statusWidget.verticalCenter = -10;
    }

    private createLabel(name: string, fontSize: number, color: Color): Label {
        const node = new Node(name);
        const transform = node.addComponent(UITransform);
        transform.setContentSize(400, 60);
        const label = node.addComponent(Label);
        label.fontSize = fontSize;
        label.lineHeight = fontSize + 10;
        label.color = color;
        return label;
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
        if (this.inputHeld) {
            return;
        }

        if (this.state === 'gameover') {
            return;
        }

        if (this.state !== 'ready') {
            return;
        }

        this.inputHeld = true;
        this.state = 'charging';
        this.chargeTime = 0;
        this.setHint('松手起跳');
    }

    private releaseCharge() {
        if (!this.inputHeld) {
            return;
        }

        this.inputHeld = false;

        if (this.state !== 'charging') {
            return;
        }

        const ratio = this.clamp01(this.chargeTime / this.maxChargeTime);
        const easedRatio = Math.pow(ratio, 0.9);
        const desiredDistance = this.lerp(this.minJumpDistance, this.maxJumpDistance, easedRatio);
        const estimatedFlightTime = (this.jumpVerticalSpeed * 2) / this.gravity;

        this.horizontalSpeed = desiredDistance / estimatedFlightTime;
        this.verticalSpeed = this.jumpVerticalSpeed;
        this.deathSpeed = 0;
        this.state = 'jumping';

        if (this.currentPlatform && this.nextPlatform) {
            const direction = new Vec3(
                this.nextPlatform.center.x - this.currentPlatform.center.x,
                0,
                this.nextPlatform.center.z - this.currentPlatform.center.z,
            );
            direction.normalize();
            this.jumpDirection.set(direction);
        }

        this.setHint('观察落点');
    }

    private buildGround() {
        if (!this.worldRoot || !this.boxMesh) {
            return;
        }

        const ground = new Node('Ground');
        ground.layer = Layers.Enum.DEFAULT;
        ground.setPosition(22, -0.5, -22);
        ground.setScale(120, 1, 120);
        this.worldRoot.addChild(ground);

        const renderer = ground.addComponent(MeshRenderer);
        renderer.mesh = this.boxMesh;
        renderer.setMaterial(this.createColorMaterial(new Color(226, 213, 201, 255)), 0);
    }

    private buildCharacter() {
        if (!this.characterVisual || !this.cylinderMesh || !this.sphereMesh) {
            return;
        }

        this.characterVisual.removeAllChildren();

        const body = new Node('Body');
        body.layer = Layers.Enum.DEFAULT;
        body.setPosition(0, 0.55, 0);
        body.setScale(0.72, 1.1, 0.72);
        this.characterVisual.addChild(body);

        const bodyRenderer = body.addComponent(MeshRenderer);
        bodyRenderer.mesh = this.cylinderMesh;
        bodyRenderer.setMaterial(this.createColorMaterial(new Color(56, 104, 168, 255)), 0);

        const head = new Node('Head');
        head.layer = Layers.Enum.DEFAULT;
        head.setPosition(0, 1.42, 0);
        head.setScale(0.78, 0.78, 0.78);
        this.characterVisual.addChild(head);

        const headRenderer = head.addComponent(MeshRenderer);
        headRenderer.mesh = this.sphereMesh;
        headRenderer.setMaterial(this.createColorMaterial(new Color(255, 231, 210, 255)), 0);

        const cap = new Node('Cap');
        cap.layer = Layers.Enum.DEFAULT;
        cap.setPosition(0, 1.82, 0);
        cap.setScale(0.5, 0.18, 0.5);
        this.characterVisual.addChild(cap);

        const capRenderer = cap.addComponent(MeshRenderer);
        capRenderer.mesh = this.boxMesh;
        capRenderer.setMaterial(this.createColorMaterial(new Color(239, 131, 84, 255)), 0);
    }

    private createColorMaterial(color: Color): Material {
        const material = new Material();
        material.initialize({
            effectName: 'builtin-unlit',
            defines: { USE_COLOR: true },
            technique: 0,
        });
        material.setProperty('mainColor', color);
        return material;
    }

    private resetGame() {
        if (!this.platformRoot || !this.characterRoot) {
            return;
        }

        this.platformRoot.destroyAllChildren();
        this.platforms = [];
        this.currentPlatformCursor = 0;
        this.score = 0;
        this.chargeTime = 0;
        this.horizontalSpeed = 0;
        this.verticalSpeed = 0;
        this.deathSpeed = 0;
        this.inputHeld = false;
        this.state = 'ready';
        this.statusPersistent = false;
        this.statusTimer = 0;
        this.restartTimer = 0;

        this.spawnStartPlatform();
        for (let i = 0; i < 5; i += 1) {
            this.spawnNextPlatform();
        }

        this.currentPlatform = this.platforms[0];
        this.nextPlatform = this.platforms[1];

        const startTop = this.getPlatformTop(this.currentPlatform);
        this.characterRoot.setPosition(this.currentPlatform.center.x, startTop, this.currentPlatform.center.z);
        this.characterVisual?.setScale(1, 1, 1);

        this.updateCharacterFacing();
        this.updateCameraTarget(true);
        this.setScore(this.score);
        this.setHint('长按屏幕或鼠标左键蓄力，松手起跳');
        this.hideStatus();
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
        const distance = this.randomRange(4.8, 7.2);
        const size = new Vec3(
            this.randomRange(2.7, 4.2),
            this.randomRange(0.8, 1.8),
            this.randomRange(2.7, 4.2),
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
        let color = this.platformColors[Math.floor(Math.random() * this.platformColors.length)];

        if (previousColor && this.platformColors.length > 1) {
            let attempts = 0;
            while (this.isSameColor(color, previousColor) && attempts < 8) {
                color = this.platformColors[Math.floor(Math.random() * this.platformColors.length)];
                attempts += 1;
            }
        }

        return new Color(color.r, color.g, color.b, color.a);
    }

    private isSameColor(a: Color, b: Color): boolean {
        return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
    }

    private createPlatform(center: Vec3, size: Vec3, color: Color): PlatformData {
        const node = new Node(`Platform-${this.platforms.length}`);
        node.layer = Layers.Enum.DEFAULT;
        node.setPosition(center);
        node.setScale(size);
        this.platformRoot?.addChild(node);

        const renderer = node.addComponent(MeshRenderer);
        renderer.mesh = this.boxMesh;
        renderer.setMaterial(this.createColorMaterial(color), 0);

        return {
            node,
            center: center.clone(),
            size: size.clone(),
            color: new Color(color.r, color.g, color.b, color.a),
        };
    }

    private updateChargingVisual(dt: number) {
        if (!this.characterVisual) {
            return;
        }

        if (this.state === 'charging' && this.inputHeld) {
            this.chargeTime = Math.min(this.maxChargeTime, this.chargeTime + dt);
            const ratio = this.clamp01(this.chargeTime / this.maxChargeTime);
            const squashX = 1 + ratio * 0.2;
            const squashY = 1 - ratio * 0.38;
            this.characterVisual.setScale(squashX, squashY, squashX);
            this.setHint(`蓄力 ${Math.round(ratio * 100)}%`);
            return;
        }

        this.characterVisual.setScale(1, 1, 1);
    }

    private updateJumping(dt: number) {
        if (!this.characterRoot) {
            return;
        }

        const position = this.characterRoot.position.clone();

        if (this.state === 'jumping') {
            position.x += this.jumpDirection.x * this.horizontalSpeed * dt;
            position.z += this.jumpDirection.z * this.horizontalSpeed * dt;

            this.verticalSpeed -= this.gravity * dt;
            position.y += this.verticalSpeed * dt;
            this.characterRoot.setPosition(position);

            if (this.tryLand(position)) {
                return;
            }

            if (position.y < -4) {
                this.enterGameOver();
            }
            return;
        }

        if (this.state === 'gameover') {
            this.deathSpeed -= this.gravity * dt;
            position.y += this.deathSpeed * dt;
            this.characterRoot.setPosition(position);
        }
    }

    private tryLand(position: Vec3): boolean {
        if (this.verticalSpeed > 0) {
            return false;
        }

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

        if (!landingPlatform || !this.characterRoot) {
            return false;
        }

        this.characterRoot.setPosition(position.x, highestTop, position.z);

        if (landingPlatform === this.nextPlatform) {
            this.onLandNextPlatform(position);
        } else {
            this.onLandCurrentPlatform();
        }

        return true;
    }

    private onLandCurrentPlatform() {
        this.state = 'ready';
        this.chargeTime = 0;
        this.horizontalSpeed = 0;
        this.verticalSpeed = 0;
        this.updateCameraTarget(false);
        this.setHint('长按继续蓄力');
    }

    private onLandNextPlatform(position: Vec3) {
        if (!this.nextPlatform) {
            return;
        }

        const dx = position.x - this.nextPlatform.center.x;
        const dz = position.z - this.nextPlatform.center.z;
        const distanceToCenter = Math.sqrt(dx * dx + dz * dz);
        const perfectThreshold = Math.min(this.nextPlatform.size.x, this.nextPlatform.size.z) * 0.16;
        const bonus = distanceToCenter <= perfectThreshold ? 2 : 1;

        this.score += bonus;
        this.setScore(this.score);

        if (bonus === 2) {
            this.showStatus('Perfect +2', new Color(255, 244, 181, 255), 0.9);
        }

        this.currentPlatformCursor += 1;
        while (this.platforms.length - this.currentPlatformCursor < 5) {
            this.spawnNextPlatform();
        }

        while (this.currentPlatformCursor > 2) {
            const removed = this.platforms.shift();
            removed?.node.destroy();
            this.currentPlatformCursor -= 1;
        }

        this.currentPlatform = this.platforms[this.currentPlatformCursor];
        this.nextPlatform = this.platforms[this.currentPlatformCursor + 1];
        this.state = 'ready';
        this.chargeTime = 0;
        this.horizontalSpeed = 0;
        this.verticalSpeed = 0;
        this.updateCharacterFacing();
        this.updateCameraTarget(false);
        this.setHint('长按蓄力，跳向下一个方块');
    }

    private enterGameOver() {
        if (this.state === 'gameover') {
            return;
        }

        this.state = 'gameover';
        this.inputHeld = false;
        this.chargeTime = 0;
        this.deathSpeed = this.verticalSpeed;
        this.restartTimer = this.restartDelay;
        this.showStatus('\u6e38\u620f\u5931\u8d25\n\u5373\u5c06\u91cd\u65b0\u5f00\u59cb', new Color(255, 244, 244, 255), this.restartDelay, false, true);
        this.setHint('\u6b63\u5728\u91cd\u65b0\u5f00\u59cb');
    }

    private updateCameraTarget(immediate: boolean) {
        if (!this.currentPlatform || !this.nextPlatform) {
            return;
        }

        this.desiredCameraFocus.set(
            (this.currentPlatform.center.x + this.nextPlatform.center.x) * 0.5,
            1.2,
            (this.currentPlatform.center.z + this.nextPlatform.center.z) * 0.5,
        );

        if (immediate) {
            this.cameraFocus.set(this.desiredCameraFocus);
            this.node.setPosition(
                this.cameraFocus.x + this.cameraOffset.x,
                this.cameraFocus.y + this.cameraOffset.y,
                this.cameraFocus.z + this.cameraOffset.z,
            );
        }
    }

    private updateCamera(dt: number) {
        const ratio = Math.min(1, dt * this.cameraSmooth);
        this.cameraFocus.set(
            this.lerp(this.cameraFocus.x, this.desiredCameraFocus.x, ratio),
            this.lerp(this.cameraFocus.y, this.desiredCameraFocus.y, ratio),
            this.lerp(this.cameraFocus.z, this.desiredCameraFocus.z, ratio),
        );

        this.node.setPosition(
            this.cameraFocus.x + this.cameraOffset.x,
            this.cameraFocus.y + this.cameraOffset.y,
            this.cameraFocus.z + this.cameraOffset.z,
        );
    }

    private updateCharacterFacing() {
        if (!this.characterVisual || !this.currentPlatform || !this.nextPlatform) {
            return;
        }

        const directionX = this.nextPlatform.center.x - this.currentPlatform.center.x;
        const directionZ = this.nextPlatform.center.z - this.currentPlatform.center.z;
        const angleY = Math.atan2(directionX, directionZ) * 180 / Math.PI;
        this.characterVisual.setRotationFromEuler(0, angleY, 0);
    }

    private isInsidePlatform(position: Vec3, platform: PlatformData): boolean {
        return Math.abs(position.x - platform.center.x) <= platform.size.x * 0.5
            && Math.abs(position.z - platform.center.z) <= platform.size.z * 0.5;
    }

    private getPlatformTop(platform: PlatformData): number {
        return platform.center.y + platform.size.y * 0.5;
    }

    private setScore(score: number) {
        if (this.scoreLabel) {
            this.scoreLabel.string = `得分 ${score}`;
        }
    }

    private setHint(text: string) {
        if (this.hintLabel) {
            this.hintLabel.string = text;
        }
    }

    private showStatus(text: string, color: Color, duration = 0, persistent = false, emphasize = false) {
        if (!this.statusLabel) {
            return;
        }

        if (this.statusPanel) {
            this.statusPanel.active = emphasize;
        }
        this.statusLabel.string = text;
        this.statusLabel.color = color;
        this.statusLabel.node.active = true;
        this.statusPersistent = persistent;
        this.statusTimer = duration;
    }

    private hideStatus() {
        if (this.statusPanel) {
            this.statusPanel.active = false;
        }
        if (this.statusLabel) {
            this.statusLabel.node.active = false;
        }
        this.statusPersistent = false;
        this.statusTimer = 0;
    }

    private updateStatus(dt: number) {
        if (this.statusPersistent || this.statusTimer <= 0) {
            return;
        }

        this.statusTimer -= dt;
        if (this.statusTimer <= 0) {
            this.hideStatus();
        }
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

    private randomRange(min: number, max: number): number {
        return min + Math.random() * (max - min);
    }

    private clamp01(value: number): number {
        if (value <= 0) {
            return 0;
        }
        if (value >= 1) {
            return 1;
        }
        return value;
    }

    private lerp(from: number, to: number, ratio: number): number {
        return from + (to - from) * ratio;
    }
}
