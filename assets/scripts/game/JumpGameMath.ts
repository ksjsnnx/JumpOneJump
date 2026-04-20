export function clamp01(value: number): number {
    if (value <= 0) {
        return 0;
    }
    if (value >= 1) {
        return 1;
    }
    return value;
}

export function lerp(from: number, to: number, ratio: number): number {
    return from + (to - from) * ratio;
}

export function randomRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
}
