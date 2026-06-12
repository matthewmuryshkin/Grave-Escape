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

const STORAGE_KEY = 'grave-escape-profile-v1';

export const START_EVENT = 'grave-escape:start';
export const STATUS_EVENT = 'grave-escape:status';

export const skinCatalog: SkinDefinition[] = [
  {
    id: 'emerald',
    name: 'Emerald Warden',
    color: 0x5cff95,
    accent: 0x12351c,
    price: 0,
    description: 'Default spectral runner.',
  },
  {
    id: 'moss',
    name: 'Moss Knight',
    color: 0x92d66c,
    accent: 0x274721,
    price: 3,
    description: 'A swamp-green armor glow for careful runs.',
  },
  {
    id: 'ivory',
    name: 'Ivory Revenant',
    color: 0xf2edd8,
    accent: 0x6d7f62,
    price: 5,
    description: 'Bone-white spirit with a grave-dust edge.',
  },
  {
    id: 'ember',
    name: 'Crimson Lantern',
    color: 0xd96c6c,
    accent: 0x4a1515,
    price: 7,
    description: 'A blood-red glow that stands out in the crypt.',
  },
];

const defaultProfile: ProfileState = {
  mode: 'single',
  bankCoins: 0,
  ownedSkins: ['emerald'],
  selectedSkins: ['emerald', 'emerald'],
};

let profile = loadProfile();
const listeners = new Set<(state: ProfileState) => void>();

function loadProfile(): ProfileState {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return { ...defaultProfile, ownedSkins: [...defaultProfile.ownedSkins], selectedSkins: [...defaultProfile.selectedSkins] };
  }

  try {
    const parsed = JSON.parse(stored) as Partial<ProfileState>;
    const ownedSkins = parsed.ownedSkins?.filter((skin): skin is SkinId => skinCatalog.some((entry) => entry.id === skin)) ?? ['emerald'];
    const selectedA = parsed.selectedSkins?.[0] ?? 'emerald';
    const selectedB = parsed.selectedSkins?.[1] ?? 'emerald';

    return {
      mode: parsed.mode === 'multi' ? 'multi' : 'single',
      bankCoins: typeof parsed.bankCoins === 'number' ? parsed.bankCoins : 0,
      ownedSkins: ownedSkins.includes('emerald') ? ownedSkins : ['emerald', ...ownedSkins],
      selectedSkins: [ownedSkins.includes(selectedA) ? selectedA : 'emerald', ownedSkins.includes(selectedB) ? selectedB : 'emerald'],
    };
  } catch {
    return { ...defaultProfile, ownedSkins: [...defaultProfile.ownedSkins], selectedSkins: [...defaultProfile.selectedSkins] };
  }
}

function saveProfile(): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

function emitProfile(): void {
  saveProfile();
  const snapshot = getProfile();
  listeners.forEach((listener) => listener(snapshot));
}

export function getProfile(): ProfileState {
  return {
    mode: profile.mode,
    bankCoins: profile.bankCoins,
    ownedSkins: [...profile.ownedSkins],
    selectedSkins: [profile.selectedSkins[0], profile.selectedSkins[1]],
  };
}

export function subscribeProfile(listener: (state: ProfileState) => void): () => void {
  listeners.add(listener);
  listener(getProfile());
  return () => listeners.delete(listener);
}

export function setMode(mode: GameMode): void {
  profile = { ...profile, mode };
  emitProfile();
}

export function purchaseSkin(skinId: SkinId): boolean {
  if (profile.ownedSkins.includes(skinId)) {
    return true;
  }

  const skin = skinCatalog.find((entry) => entry.id === skinId);
  if (!skin || profile.bankCoins < skin.price) {
    return false;
  }

  profile = {
    ...profile,
    bankCoins: profile.bankCoins - skin.price,
    ownedSkins: [...profile.ownedSkins, skinId],
  };
  emitProfile();
  return true;
}

export function selectSkin(slot: 0 | 1, skinId: SkinId): boolean {
  if (!profile.ownedSkins.includes(skinId)) {
    return false;
  }

  const selectedSkins: [SkinId, SkinId] = [profile.selectedSkins[0], profile.selectedSkins[1]];
  selectedSkins[slot] = skinId;
  profile = { ...profile, selectedSkins };
  emitProfile();
  return true;
}

export function addBankCoins(amount: number): void {
  if (amount <= 0) {
    return;
  }

  profile = {
    ...profile,
    bankCoins: profile.bankCoins + amount,
  };
  emitProfile();
}

export function publishStatus(status: RunStatus): void {
  window.dispatchEvent(new CustomEvent<RunStatus>(STATUS_EVENT, { detail: status }));
}