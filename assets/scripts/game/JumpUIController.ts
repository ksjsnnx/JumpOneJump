import {
    Canvas,
    Color,
    Graphics,
    Label,
    Layers,
    Node,
    Scene,
    UITransform,
    Widget,
    view,
} from 'cc';

import { JUMP_GAME_CONFIG, JUMP_GAME_TEXT } from './JumpGameConfig';
import { JumpViewportState } from './JumpWebSupport';

export class JumpUIController {
    private uiRoot: Node | null = null;
    private scoreLabel: Label | null = null;
    private hintLabel: Label | null = null;
    private statusLabel: Label | null = null;
    private orientationTipNode: Node | null = null;
    private orientationLabel: Label | null = null;
    private statusPanel: Node | null = null;

    private statusPersistent = false;
    private statusTimer = 0;

    initialize(scene: Scene) {
        const oldUi = scene.getChildByName('JumpOneUI');
        if (oldUi) {
            oldUi.destroy();
        }

        this.uiRoot = new Node('JumpOneUI');
        this.uiRoot.layer = Layers.Enum.UI_2D;
        scene.addChild(this.uiRoot);

        const canvas = this.uiRoot.addComponent(Canvas);
        canvas.alignCanvasWithScreen = true;

        const transform = this.uiRoot.getComponent(UITransform) ?? this.uiRoot.addComponent(UITransform);
        transform.setContentSize(view.getVisibleSize());

        this.buildStatusPanel();
        this.buildScoreLabel();
        this.buildHintLabel();
        this.buildStatusLabel();
        this.buildOrientationLabel();
    }

    setScore(score: number) {
        if (this.scoreLabel) {
            this.scoreLabel.string = `${JUMP_GAME_TEXT.scorePrefix} ${score}`;
        }
    }

    setHint(text: string) {
        if (this.hintLabel) {
            this.hintLabel.string = text;
        }
    }

    showStatus(text: string, color: Color, duration = 0, persistent = false, emphasize = false) {
        if (this.statusPanel) {
            this.statusPanel.active = emphasize;
        }
        if (this.statusLabel) {
            this.statusLabel.string = text;
            this.statusLabel.color = color;
            this.statusLabel.node.active = true;
        }

        this.statusPersistent = persistent;
        this.statusTimer = duration;
    }

    hideStatus() {
        if (this.statusPanel) {
            this.statusPanel.active = false;
        }
        if (this.statusLabel) {
            this.statusLabel.node.active = false;
        }

        this.statusPersistent = false;
        this.statusTimer = 0;
    }

    update(dt: number) {
        if (this.statusPersistent || this.statusTimer <= 0) {
            return;
        }

        this.statusTimer -= dt;
        if (this.statusTimer <= 0) {
            this.hideStatus();
        }
    }

    reset() {
        this.setScore(0);
        this.setHint(JUMP_GAME_TEXT.defaultHint);
        this.hideStatus();
    }

    refreshLayout(viewport: JumpViewportState) {
        if (!this.uiRoot) {
            return;
        }

        const rootTransform = this.uiRoot.getComponent(UITransform);
        rootTransform?.setContentSize(view.getVisibleSize());

        this.updateScoreLayout(viewport);
        this.updateHintLayout(viewport);
        this.updateStatusLayout(viewport);
        this.updateOrientationTip(viewport);
    }

    private buildStatusPanel() {
        if (!this.uiRoot) {
            return;
        }

        this.statusPanel = new Node('StatusPanel');
        this.statusPanel.layer = Layers.Enum.UI_2D;
        this.statusPanel.parent = this.uiRoot;

        const panelTransform = this.statusPanel.addComponent(UITransform);
        panelTransform.setContentSize(560, 220);

        const panelGraphics = this.statusPanel.addComponent(Graphics);
        panelGraphics.fillColor = JUMP_GAME_CONFIG.statusPanelFill;
        panelGraphics.roundRect(-280, -110, 560, 220, 24);
        panelGraphics.fill();
        panelGraphics.strokeColor = JUMP_GAME_CONFIG.statusPanelStroke;
        panelGraphics.lineWidth = 4;
        panelGraphics.roundRect(-280, -110, 560, 220, 24);
        panelGraphics.stroke();
        this.statusPanel.active = false;

        const panelWidget = this.statusPanel.addComponent(Widget);
        panelWidget.isAlignHorizontalCenter = true;
        panelWidget.horizontalCenter = 0;
        panelWidget.isAlignVerticalCenter = true;
        panelWidget.verticalCenter = -10;
    }

    private buildScoreLabel() {
        if (!this.uiRoot) {
            return;
        }

        this.scoreLabel = this.createLabel('ScoreLabel', 38, JUMP_GAME_CONFIG.scoreColor);
        this.scoreLabel.node.parent = this.uiRoot;
        this.scoreLabel.node.layer = Layers.Enum.UI_2D;

        const scoreWidget = this.scoreLabel.node.addComponent(Widget);
        scoreWidget.isAlignTop = true;
        scoreWidget.isAlignLeft = true;
        scoreWidget.top = 28;
        scoreWidget.left = 28;
    }

    private buildHintLabel() {
        if (!this.uiRoot) {
            return;
        }

        this.hintLabel = this.createLabel('HintLabel', 26, JUMP_GAME_CONFIG.hintColor);
        this.hintLabel.node.parent = this.uiRoot;
        this.hintLabel.node.layer = Layers.Enum.UI_2D;
        this.hintLabel.horizontalAlign = Label.HorizontalAlign.CENTER;

        const hintTransform = this.hintLabel.getComponent(UITransform);
        hintTransform?.setContentSize(820, 60);

        const hintWidget = this.hintLabel.node.addComponent(Widget);
        hintWidget.isAlignBottom = true;
        hintWidget.bottom = 34;
        hintWidget.isAlignHorizontalCenter = true;
        hintWidget.horizontalCenter = 0;
    }

    private buildStatusLabel() {
        if (!this.uiRoot) {
            return;
        }

        this.statusLabel = this.createLabel('StatusLabel', 52, JUMP_GAME_CONFIG.statusColor);
        this.statusLabel.node.parent = this.uiRoot;
        this.statusLabel.node.layer = Layers.Enum.UI_2D;
        this.statusLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        this.statusLabel.verticalAlign = Label.VerticalAlign.CENTER;
        this.statusLabel.node.active = false;

        const statusTransform = this.statusLabel.getComponent(UITransform);
        statusTransform?.setContentSize(520, 180);

        const statusWidget = this.statusLabel.node.addComponent(Widget);
        statusWidget.isAlignHorizontalCenter = true;
        statusWidget.horizontalCenter = 0;
        statusWidget.isAlignVerticalCenter = true;
        statusWidget.verticalCenter = -10;
    }

    private buildOrientationLabel() {
        if (!this.uiRoot) {
            return;
        }

        this.orientationTipNode = new Node('OrientationTip');
        this.orientationTipNode.layer = Layers.Enum.UI_2D;
        this.orientationTipNode.parent = this.uiRoot;
        this.orientationTipNode.active = false;

        const tipTransform = this.orientationTipNode.addComponent(UITransform);
        tipTransform.setContentSize(280, 48);

        const tipGraphics = this.orientationTipNode.addComponent(Graphics);
        tipGraphics.fillColor = JUMP_GAME_CONFIG.orientationTipBackground;
        tipGraphics.roundRect(-140, -24, 280, 48, 18);
        tipGraphics.fill();

        const orientationWidget = this.orientationTipNode.addComponent(Widget);
        orientationWidget.isAlignTop = true;
        orientationWidget.top = 28;
        orientationWidget.isAlignHorizontalCenter = true;
        orientationWidget.horizontalCenter = 0;

        this.orientationLabel = this.createLabel('OrientationLabelText', 24, JUMP_GAME_CONFIG.orientationTipColor);
        this.orientationLabel.node.parent = this.orientationTipNode;
        this.orientationLabel.node.layer = Layers.Enum.UI_2D;
        this.orientationLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        this.orientationLabel.verticalAlign = Label.VerticalAlign.CENTER;

        const orientationTransform = this.orientationLabel.getComponent(UITransform);
        orientationTransform?.setContentSize(260, 40);
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

    private updateScoreLayout(viewport: JumpViewportState) {
        if (!this.scoreLabel) {
            return;
        }

        const scoreFontSize = viewport.isCompact ? 30 : 38;
        this.scoreLabel.fontSize = scoreFontSize;
        this.scoreLabel.lineHeight = scoreFontSize + 10;

        const scoreTransform = this.scoreLabel.getComponent(UITransform);
        scoreTransform?.setContentSize(viewport.isCompact ? 280 : 400, 60);

        const scoreWidget = this.scoreLabel.node.getComponent(Widget);
        if (scoreWidget) {
            scoreWidget.top = viewport.isCompact ? 18 : 28;
            scoreWidget.left = viewport.isCompact ? 16 : 28;
        }
    }

    private updateHintLayout(viewport: JumpViewportState) {
        if (!this.hintLabel) {
            return;
        }

        const hintFontSize = viewport.isCompact ? 20 : 26;
        this.hintLabel.fontSize = hintFontSize;
        this.hintLabel.lineHeight = hintFontSize + 10;

        const hintTransform = this.hintLabel.getComponent(UITransform);
        hintTransform?.setContentSize(Math.min(Math.max(viewport.width - 48, 240), 820), viewport.isCompact ? 80 : 60);

        const hintWidget = this.hintLabel.node.getComponent(Widget);
        if (hintWidget) {
            hintWidget.bottom = viewport.isCompact ? 22 : 34;
        }
    }

    private updateStatusLayout(viewport: JumpViewportState) {
        if (this.statusPanel) {
            const panelTransform = this.statusPanel.getComponent(UITransform);
            panelTransform?.setContentSize(viewport.isCompact ? 420 : 560, viewport.isCompact ? 180 : 220);

            const panelGraphics = this.statusPanel.getComponent(Graphics);
            if (panelGraphics) {
                const width = viewport.isCompact ? 420 : 560;
                const height = viewport.isCompact ? 180 : 220;
                const halfWidth = width * 0.5;
                const halfHeight = height * 0.5;
                panelGraphics.clear();
                panelGraphics.fillColor = JUMP_GAME_CONFIG.statusPanelFill;
                panelGraphics.roundRect(-halfWidth, -halfHeight, width, height, 24);
                panelGraphics.fill();
                panelGraphics.strokeColor = JUMP_GAME_CONFIG.statusPanelStroke;
                panelGraphics.lineWidth = 4;
                panelGraphics.roundRect(-halfWidth, -halfHeight, width, height, 24);
                panelGraphics.stroke();
            }
        }

        if (!this.statusLabel) {
            return;
        }

        const statusFontSize = viewport.isCompact ? 40 : 52;
        this.statusLabel.fontSize = statusFontSize;
        this.statusLabel.lineHeight = statusFontSize + 10;

        const statusTransform = this.statusLabel.getComponent(UITransform);
        statusTransform?.setContentSize(viewport.isCompact ? 380 : 520, viewport.isCompact ? 150 : 180);
    }

    private updateOrientationTip(viewport: JumpViewportState) {
        if (!this.orientationLabel || !this.orientationTipNode) {
            return;
        }

        const width = viewport.isCompact ? 220 : 280;
        const height = viewport.isCompact ? 42 : 48;
        const tipTransform = this.orientationTipNode.getComponent(UITransform);
        tipTransform?.setContentSize(width, height);

        const tipGraphics = this.orientationTipNode.getComponent(Graphics);
        if (tipGraphics) {
            const halfWidth = width * 0.5;
            const halfHeight = height * 0.5;
            tipGraphics.clear();
            tipGraphics.fillColor = JUMP_GAME_CONFIG.orientationTipBackground;
            tipGraphics.roundRect(-halfWidth, -halfHeight, width, height, 18);
            tipGraphics.fill();
        }

        this.orientationTipNode.active = viewport.shouldSuggestPortrait;
        this.orientationLabel.string = JUMP_GAME_TEXT.rotateTip;

        const orientationFontSize = viewport.isCompact ? 20 : 24;
        this.orientationLabel.fontSize = orientationFontSize;
        this.orientationLabel.lineHeight = orientationFontSize + 8;

        const orientationTransform = this.orientationLabel.getComponent(UITransform);
        orientationTransform?.setContentSize(width - 20, height - 8);
    }
}
