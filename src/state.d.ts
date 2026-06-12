export type GameMode = 'single' | 'multi';
export type SkinId = 'emerald' | 'moss' | 'ivory' | 'ember';
export interface SkinDefinition {
    id: SkinId;
    name: string;
    color: number;
    accent: number;
    price: number;
    description: string;
}
export interface ProfileState {
    mode: GameMode;
    bankCoins: number;
    ownedSkins: SkinId[];
    selectedSkins: [SkinId, SkinId];
}
export interface RunStatus {
    active: boolean;
    level: number;
    lives: number;
    coinsInLevel: number;
    totalRunCoins: number;
    message: string;
    outcome: 'idle' | 'running' | 'won' | 'lost';
}
export declare const START_EVENT = "grave-escape:start";
export declare const STATUS_EVENT = "grave-escape:status";
export declare const skinCatalog: SkinDefinition[];
export declare function getProfile(): ProfileState;
export declare function subscribeProfile(listener: (state: ProfileState) => void): () => void;
export declare function setMode(mode: GameMode): void;
export declare function purchaseSkin(skinId: SkinId): boolean;
export declare function selectSkin(slot: 0 | 1, skinId: SkinId): boolean;
export declare function addBankCoins(amount: number): void;
export declare function publishStatus(status: RunStatus): void;
//# sourceMappingURL=state.d.ts.map