import { Color, Node, Vec3 } from 'cc';

export type GameState = 'ready' | 'charging' | 'jumping' | 'gameover';

export interface PlatformData {
    node: Node;
    center: Vec3;
    size: Vec3;
    color: Color;
}
