import { view } from 'cc';

import { JUMP_WEB_META } from './JumpGameConfig';

export interface JumpViewportState {
    width: number;
    height: number;
    isTouchDevice: boolean;
    isLandscape: boolean;
    isCompact: boolean;
    shouldSuggestPortrait: boolean;
}

export class JumpWebSupport {
    private resizeHandler: (() => void) | null = null;

    initialize(onViewportChange: (state: JumpViewportState) => void) {
        this.applyPageMetadata();

        const emitViewport = () => onViewportChange(this.getViewportState());
        this.resizeHandler = emitViewport;

        if (typeof window !== 'undefined') {
            window.addEventListener('resize', emitViewport);
            window.addEventListener('orientationchange', emitViewport);
        }

        emitViewport();
    }

    dispose() {
        if (!this.resizeHandler || typeof window === 'undefined') {
            return;
        }

        window.removeEventListener('resize', this.resizeHandler);
        window.removeEventListener('orientationchange', this.resizeHandler);
        this.resizeHandler = null;
    }

    getViewportState(): JumpViewportState {
        const visibleSize = view.getVisibleSize();
        const width = visibleSize.width;
        const height = visibleSize.height;
        const isTouchDevice = this.isTouchDevice();
        const isLandscape = width > height;
        const isCompact = Math.min(width, height) < 720;
        const shouldSuggestPortrait = isTouchDevice && isLandscape && width < 1100;

        return {
            width,
            height,
            isTouchDevice,
            isLandscape,
            isCompact,
            shouldSuggestPortrait,
        };
    }

    private applyPageMetadata() {
        if (typeof document === 'undefined') {
            return;
        }

        document.title = JUMP_WEB_META.title;
        document.documentElement.style.backgroundColor = JUMP_WEB_META.themeColor;

        if (document.body) {
            document.body.style.backgroundColor = JUMP_WEB_META.themeColor;
        }

        this.upsertMetaTag('name', 'viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
        this.upsertMetaTag('name', 'description', JUMP_WEB_META.description);
        this.upsertMetaTag('name', 'theme-color', JUMP_WEB_META.themeColor);
        this.upsertMetaTag('name', 'apple-mobile-web-app-capable', 'yes');
        this.upsertMetaTag('name', 'apple-mobile-web-app-title', JUMP_WEB_META.title);
        this.upsertMetaTag('name', 'mobile-web-app-capable', 'yes');
        this.upsertMetaTag('property', 'og:title', JUMP_WEB_META.shareTitle);
        this.upsertMetaTag('property', 'og:description', JUMP_WEB_META.shareDescription);
        this.upsertMetaTag('property', 'og:type', 'website');
        this.upsertMetaTag('name', 'twitter:card', 'summary');
        this.upsertMetaTag('name', 'twitter:title', JUMP_WEB_META.shareTitle);
        this.upsertMetaTag('name', 'twitter:description', JUMP_WEB_META.shareDescription);
    }

    private upsertMetaTag(attributeName: 'name' | 'property', attributeValue: string, content: string) {
        if (typeof document === 'undefined') {
            return;
        }

        let element = document.head.querySelector(`meta[${attributeName}="${attributeValue}"]`) as HTMLMetaElement | null;
        if (!element) {
            element = document.createElement('meta');
            element.setAttribute(attributeName, attributeValue);
            document.head.appendChild(element);
        }
        element.setAttribute('content', content);
    }

    private isTouchDevice(): boolean {
        if (typeof window === 'undefined') {
            return false;
        }

        return 'ontouchstart' in window || window.navigator.maxTouchPoints > 0;
    }
}
