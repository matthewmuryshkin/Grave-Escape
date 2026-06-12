import Phaser from 'phaser';
import { MainScene } from './scenes/MainScene';
import {
  START_EVENT,
  STATUS_EVENT,
  purchaseSkin,
  selectSkin,
  setMode,
  skinCatalog,
  subscribeProfile,
  type ProfileState,
  type RunStatus,
  type SkinId,
} from './state';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 960,
  height: 640,
  backgroundColor: '#0a1a0a',
  parent: 'game-container',
  scene: [MainScene],
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },
};

window.addEventListener('DOMContentLoaded', () => {
  new Phaser.Game(config);

  const sidebar = document.getElementById('sidebar');
  const startBtn = document.getElementById('start-btn');
  let latestProfile: ProfileState = {
    mode: 'single',
    bankCoins: 0,
    ownedSkins: ['emerald'],
    selectedSkins: ['emerald', 'emerald'],
  };
  let latestStatus: RunStatus = {
    active: false,
    level: 1,
    lives: 0,
    coinsInLevel: 0,
    totalRunCoins: 0,
    message: 'Choose a mode, unlock skins, and press Start Game.',
    outcome: 'idle',
  };

  const renderSidebar = (profile: ProfileState): void => {
    if (!sidebar) {
      return;
    }

    const modeButtons = [
      { id: 'single', label: 'Single Player', active: profile.mode === 'single' },
      { id: 'multi', label: 'Multiplayer', active: profile.mode === 'multi' },
    ].map((mode) => `
      <button class="mode-btn${mode.active ? ' active' : ''}" data-mode="${mode.id}">${mode.label}</button>
    `).join('');

    const skinCards = skinCatalog.map((skin) => {
      const owned = profile.ownedSkins.includes(skin.id);
      const p1Selected = profile.selectedSkins[0] === skin.id;
      const p2Selected = profile.selectedSkins[1] === skin.id;

      return `
        <article class="skin-card">
          <div class="skin-chip" style="background:#${skin.color.toString(16).padStart(6, '0')}"></div>
          <div class="skin-copy">
            <h4>${skin.name}</h4>
            <p>${skin.description}</p>
            <span>${owned ? 'Owned' : `${skin.price} coins`}</span>
          </div>
          <div class="skin-actions">
            ${owned ? `<button class="skin-select${p1Selected ? ' active' : ''}" data-slot="0" data-skin="${skin.id}">${p1Selected ? 'P1 Selected' : 'Use for P1'}</button>` : `<button class="skin-buy" data-skin="${skin.id}">Unlock</button>`}
            ${profile.mode === 'multi' ? (owned ? `<button class="skin-select${p2Selected ? ' active' : ''}" data-slot="1" data-skin="${skin.id}">${p2Selected ? 'P2 Selected' : 'Use for P2'}</button>` : '<span class="skin-placeholder">Unlock first</span>') : ''}
          </div>
        </article>
      `;
    }).join('');

    sidebar.innerHTML = `
      <section class="panel-block">
        <h2>How To Play</h2>
        <p>Escape each crypt, collect all 3 coins, then touch the exit before the hunters catch you.</p>
        <ul>
          <li>Beat 3 levels to win.</li>
          <li>Single Player: WASD.</li>
          <li>Multiplayer: Player 1 uses WASD, Player 2 uses Arrow Keys.</li>
          <li>Press H or click the in-game button to open the rules.</li>
        </ul>
      </section>
      <section class="panel-block">
        <h3>Run Status</h3>
        <div class="mode-row">${modeButtons}</div>
        <p class="bank-line">Banked coins: <strong>${profile.bankCoins}</strong></p>
        <p class="status-line">${latestStatus.message}</p>
        <p class="status-mini">Level ${latestStatus.level} | Lives ${latestStatus.lives} | Banked this run ${latestStatus.totalRunCoins}</p>
      </section>
      <section class="panel-block">
        <h3>Skin Shop</h3>
        <p class="shop-copy">Unlock skins with coins, then equip them for Player 1 or Player 2.</p>
        <div class="skin-grid">${skinCards}</div>
      </section>
    `;

    sidebar.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((button) => {
      button.addEventListener('click', () => {
        const mode = button.dataset.mode;
        if (mode === 'single' || mode === 'multi') {
          setMode(mode);
        }
      });
    });

    sidebar.querySelectorAll<HTMLButtonElement>('.skin-buy').forEach((button) => {
      button.addEventListener('click', () => {
        const skin = button.dataset.skin as SkinId | undefined;
        if (skin) {
          purchaseSkin(skin);
        }
      });
    });

    sidebar.querySelectorAll<HTMLButtonElement>('.skin-select').forEach((button) => {
      button.addEventListener('click', () => {
        const skin = button.dataset.skin as SkinId | undefined;
        const slot = button.dataset.slot === '1' ? 1 : 0;
        if (skin) {
          selectSkin(slot as 0 | 1, skin);
        }
      });
    });
  };

  subscribeProfile((profile) => {
    latestProfile = profile;
    renderSidebar(profile);
  });

  window.addEventListener(STATUS_EVENT, (event) => {
    latestStatus = (event as CustomEvent<RunStatus>).detail;
    renderSidebar(latestProfile);
  });

  if (startBtn) {
    startBtn.addEventListener('click', () => {
      window.dispatchEvent(new Event(START_EVENT));
      startBtn.textContent = 'Restart Run';
    });
  }
});
