import {
    Camera,
    Color,
    Layers,
    Material,
    Mesh,
    MeshRenderer,
    Node,
    Scene,
    Vec3,
    primitives,
    utils,
} from 'cc';

import { JUMP_GAME_CONFIG } from './JumpGameConfig';

export class JumpWorld {
    worldRoot: Node | null = null;
    platformRoot: Node | null = null;
    characterRoot: Node | null = null;
    characterVisual: Node | null = null;

    private boxMesh: Mesh | null = null;
    private cylinderMesh: Mesh | null = null;
    private sphereMesh: Mesh | null = null;

    initialize(scene: Scene, camera: Camera, cameraNode: Node) {
        this.buildMeshCache();
        this.setupSceneRoots(scene);
        this.setupCamera(camera, cameraNode);
        this.buildCharacter();
        this.buildGround();
    }

    resetPlatforms() {
        this.platformRoot?.destroyAllChildren();
    }

    createPlatform(index: number, center: Vec3, size: Vec3, color: Color): Node {
        const node = new Node(`Platform-${index}`);
        node.layer = Layers.Enum.DEFAULT;
        node.setPosition(center);
        node.setScale(size);
        this.platformRoot?.addChild(node);

        const renderer = node.addComponent(MeshRenderer);
        renderer.mesh = this.boxMesh;
        renderer.setMaterial(this.createColorMaterial(color), 0);

        return node;
    }

    placeCharacter(position: Vec3) {
        this.characterRoot?.setPosition(position);
    }

    setCharacterScale(x: number, y: number, z: number) {
        this.characterVisual?.setScale(x, y, z);
    }

    setCharacterFacing(angleY: number) {
        this.characterVisual?.setRotationFromEuler(0, angleY, 0);
    }

    private buildMeshCache() {
        this.boxMesh = utils.MeshUtils.createMesh(primitives.box());
        this.cylinderMesh = utils.MeshUtils.createMesh(primitives.cylinder(0.5, 0.5, 1));
        this.sphereMesh = utils.MeshUtils.createMesh(primitives.sphere(0.5));
    }

    private setupSceneRoots(scene: Scene) {
        const oldWorld = scene.getChildByName('JumpOneWorld');
        if (oldWorld) {
            oldWorld.destroy();
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
    }

    private setupCamera(camera: Camera, cameraNode: Node) {
        camera.projection = Camera.ProjectionType.ORTHO;
        camera.orthoHeight = 9.5;
        camera.clearFlags = Camera.ClearFlag.SOLID_COLOR;
        camera.clearColor = JUMP_GAME_CONFIG.worldClearColor;
        camera.near = 0.1;
        camera.far = 200;

        cameraNode.setRotationFromEuler(-35, -45, 0);
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
        renderer.setMaterial(this.createColorMaterial(JUMP_GAME_CONFIG.groundColor), 0);
    }

    private buildCharacter() {
        if (!this.characterVisual || !this.boxMesh || !this.cylinderMesh || !this.sphereMesh) {
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
        bodyRenderer.setMaterial(this.createColorMaterial(JUMP_GAME_CONFIG.playerBodyColor), 0);

        const head = new Node('Head');
        head.layer = Layers.Enum.DEFAULT;
        head.setPosition(0, 1.42, 0);
        head.setScale(0.78, 0.78, 0.78);
        this.characterVisual.addChild(head);

        const headRenderer = head.addComponent(MeshRenderer);
        headRenderer.mesh = this.sphereMesh;
        headRenderer.setMaterial(this.createColorMaterial(JUMP_GAME_CONFIG.playerHeadColor), 0);

        const cap = new Node('Cap');
        cap.layer = Layers.Enum.DEFAULT;
        cap.setPosition(0, 1.82, 0);
        cap.setScale(0.5, 0.18, 0.5);
        this.characterVisual.addChild(cap);

        const capRenderer = cap.addComponent(MeshRenderer);
        capRenderer.mesh = this.boxMesh;
        capRenderer.setMaterial(this.createColorMaterial(JUMP_GAME_CONFIG.playerCapColor), 0);
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
}
