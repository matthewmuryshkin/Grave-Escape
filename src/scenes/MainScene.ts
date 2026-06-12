import Phaser from 'phaser';
import {
  START_EVENT,
  addBankCoins,
  getProfile,
  publishStatus,
  skinCatalog,
  type GameMode,
  type SkinId,
} from '../state';

type TilePoint = { col: number; row: number };

type PlayerControls = {
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
};

type PlayerAgent = {
  sprite: Phaser.GameObjects.Rectangle;
  body: Phaser.Physics.Arcade.Body;
  controls: PlayerControls;
};

type EnemyAgent = {
  sprite: Phaser.GameObjects.Rectangle;
  body: Phaser.Physics.Arcade.Body;
  path: TilePoint[];
  repathAt: number;
};

type LevelData = {
  name: string;
  map: string[];
};

const TILE_SIZE = 48;
const ORIGIN_X = 72;
const ORIGIN_Y = 84;
const PLAYER_SPEED = 175;
const ENEMY_SPEED = 142;
const PLAYER_HIT_DISTANCE = 26;
const TITLE_FONT = '"Cinzel Decorative","Cinzel",serif';
const UI_FONT = '"Cinzel",serif';
const BODY_FONT = '"Cormorant Garamond",Georgia,serif';
const LEVELS: LevelData[] = [
  {
    name: 'Crypt Gate',
    map: [
      '#################',
      '#S..C....#....O.#',
      '#.###.##.#.###..#',
      '#...#....#...#..#',
      '###.#.######.#.##',
      '#...#....C...#..#',
      '#.#####.#######.#',
      '#...#....#...#..#',
      '#.C.#.##.#.#.#G.#',
      '#....T..E..#....#',
      '#################',
    ],
  },
  {
    name: 'Moss Catacombs',
    map: [
      '#################',
      '#S..#..C....#O..#',
      '#....#.....##...#',
      '#.##.#..G..#....#',
      '#....#....##.#..#',
      '#.##....#....#..#',
      '#.####......##..#',
      '#C...#..#...#...#',
      '#....#..#...#...#',
      '#..T.......C....#',
      '#################',
    ],
  },
  {
    name: 'Throne of Ash',
    map: [
      '#################',
      '#S.C.........C.O#',
      '#.##...#...##...#',
      '#....#...#...#G.#',
      '#.##.#...##.#...#',
      '#....#....#.#...#',
      '#.###..##.#...#.#',
      '#..C..#....#G...#',
      '#..##...#..###..#',
      '#..T..E........##',
      '#################',
    ],
  },
];

export class MainScene extends Phaser.Scene {
  private levelIndex = 0;
  private mode: GameMode = 'single';
  private players: PlayerAgent[] = [];
  private enemies: EnemyAgent[] = [];
  private walls: Phaser.Physics.Arcade.StaticGroup | undefined;
  private coins: Phaser.Physics.Arcade.Group | undefined;
  private exit: Phaser.GameObjects.Rectangle | undefined;
  private decorations: Phaser.GameObjects.Group | undefined;
  private hudStats?: Phaser.GameObjects.Text;
  private levelBanner?: Phaser.GameObjects.Text;
  private waitingText?: Phaser.GameObjects.Text;
  private endText?: Phaser.GameObjects.Text;
  private rulesLayer?: Phaser.GameObjects.Container;
  private rulesOpen = false;
  private runActive = false;
  private runOutcome: 'idle' | 'running' | 'won' | 'lost' = 'idle';
  private coinsRemaining = 0;
  private levelCoinsCollected = 0;
  private totalRunCoins = 0;
  private lives = 3;
  private currentMap: string[] = [];
  private hitCooldownUntil = 0;
  private readonly startHandler = () => this.startRun();

  constructor() {
    super('MainScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#07110a');
    this.add.rectangle(480, 320, 960, 640, 0x08120a).setAlpha(0.95);

    this.add.text(32, 20, 'Grave Escape', {
      fontFamily: TITLE_FONT,
      fontSize: '32px',
      color: '#b6ffb6',
    });

    this.hudStats = this.add.text(32, 58, '', {
      fontFamily: BODY_FONT,
      fontSize: '20px',
      color: '#94e3a7',
      lineSpacing: 6,
    });

    this.levelBanner = this.add.text(680, 20, '', {
      fontFamily: UI_FONT,
      fontSize: '24px',
      color: '#89ffb1',
    });

    const helpButton = this.add.text(780, 56, 'How To Play (H)', {
      fontFamily: UI_FONT,
      fontSize: '18px',
      color: '#07110a',
      backgroundColor: '#86ffab',
      padding: { left: 12, right: 12, top: 8, bottom: 8 },
    }).setInteractive({ useHandCursor: true });
    helpButton.on('pointerdown', () => this.toggleRules());

    this.waitingText = this.add.text(480, 320, 'Choose a mode, purchase skins, then press Start Game.', {
      fontFamily: UI_FONT,
      fontSize: '30px',
      color: '#d8ffe3',
      align: 'center',
      wordWrap: { width: 560 },
    }).setOrigin(0.5);

    this.endText = this.add.text(480, 320, '', {
      fontFamily: TITLE_FONT,
      fontSize: '34px',
      color: '#effff3',
      align: 'center',
      wordWrap: { width: 560 },
    }).setOrigin(0.5).setVisible(false);

    this.rulesLayer = this.buildRulesOverlay();
    this.rulesLayer.setVisible(false);

    this.input.keyboard?.on('keydown-H', () => this.toggleRules());
    window.addEventListener(START_EVENT, this.startHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener(START_EVENT, this.startHandler);
    });

    this.physics.world.setBounds(ORIGIN_X, ORIGIN_Y, TILE_SIZE * 17, TILE_SIZE * 11);
    this.updateHudText('Press Start Game to enter the first crypt.');
  }

  update(time: number): void {
    if (!this.runActive || this.rulesOpen) {
      this.players.forEach((player) => player.body.setVelocity(0, 0));
      this.enemies.forEach((enemy) => enemy.body.setVelocity(0, 0));
      return;
    }

    this.updatePlayers();
    this.updateEnemies(time);
  }

  private startRun(): void {
    this.mode = getProfile().mode;
    this.levelIndex = 0;
    this.lives = this.mode === 'multi' ? 5 : 3;
    this.totalRunCoins = 0;
    this.runActive = true;
    this.runOutcome = 'running';
    this.rulesOpen = false;
    this.rulesLayer?.setVisible(false);
    this.waitingText?.setVisible(false);
    this.endText?.setVisible(false);
    this.loadLevel(this.levelIndex);
    this.updateHudText('Collect every coin, then reach the glowing exit.');
  }

  private loadLevel(levelIndex: number): void {
    this.clearLevel();

    const level = LEVELS[levelIndex] ?? LEVELS[0]!;
    const profile = getProfile();
    const playerSpawns: TilePoint[] = [];
    const enemySpawns: TilePoint[] = [];
    let exitPoint: TilePoint | null = null;

    this.currentMap = level.map;
    this.coinsRemaining = 0;
    this.levelCoinsCollected = 0;
    this.hitCooldownUntil = 0;
    this.levelBanner?.setText(`Level ${levelIndex + 1}: ${level.name}`);

    this.decorations = this.add.group();
    this.walls = this.physics.add.staticGroup();
    this.coins = this.physics.add.group({ allowGravity: false, immovable: true });

    for (let row = 0; row < level.map.length; row += 1) {
      const line = level.map[row] ?? '';
      for (let col = 0; col < line.length; col += 1) {
        const tile = line[col] ?? '#';
        const x = ORIGIN_X + col * TILE_SIZE + TILE_SIZE / 2;
        const y = ORIGIN_Y + row * TILE_SIZE + TILE_SIZE / 2;

        if (tile === '#') {
          // Wall tile
          const wall = this.add.rectangle(x, y, TILE_SIZE, TILE_SIZE, 0x18361f);
          wall.setStrokeStyle(2, 0x6eff9d, 0.28);
          this.decorations?.add(wall);

          const blocker = this.add.rectangle(x, y, TILE_SIZE, TILE_SIZE, 0x000000, 0);
          this.physics.add.existing(blocker, true);
          const blockerBody = blocker.body as Phaser.Physics.Arcade.StaticBody;
          blockerBody.setSize(TILE_SIZE, TILE_SIZE);
          blockerBody.updateFromGameObject();
          this.walls.add(blocker);
        } else {
          const floor = this.add.rectangle(x, y, TILE_SIZE, TILE_SIZE, (row + col) % 2 === 0 ? 0x102016 : 0x0b160e);
          floor.setStrokeStyle(1, 0x1d3424, 0.65);
          this.decorations?.add(floor);
        }

        if (tile === 'C') {
          // Coin
          const coin = this.add.rectangle(x, y, 18, 18, 0xe9ff8f).setAngle(45);
          coin.setStrokeStyle(3, 0x7da227);
          this.physics.add.existing(coin);
          const body = coin.body as Phaser.Physics.Arcade.Body;
          body.setAllowGravity(false).setImmovable(true);
          body.setCircle(18);
          body.setOffset(-9, -9);
          this.coins.add(coin);
          this.coinsRemaining += 1;
          this.tweens.add({ targets: coin, alpha: 0.65, scaleX: 1.18, scaleY: 1.18, duration: 260, yoyo: true, repeat: -1 });
        }

        if (tile === 'S') {
          playerSpawns[0] = { col, row };
        }

        if (tile === 'T') {
          playerSpawns[1] = { col, row };
        }

        if (tile === 'E' || tile === 'G') {
          enemySpawns.push({ col, row });
        }

        if (tile === 'O') {
          exitPoint = { col, row };
        }
      }
    }

    this.createExit(exitPoint ?? { col: 15, row: 1 });
    this.createPlayers(playerSpawns, profile.selectedSkins);
    this.createEnemies(enemySpawns);
    this.updateHudText('Sweep the maze for every coin before escaping.');
  }

  private createExit(tile: TilePoint): void {
    const world = this.tileToWorld(tile);
    this.exit = this.add.rectangle(world.x, world.y, TILE_SIZE - 12, TILE_SIZE - 12, 0x204c2b);
    this.exit.setStrokeStyle(4, 0xa5ffc0);
    this.tweens.add({ targets: this.exit, alpha: 0.5, duration: 700, yoyo: true, repeat: -1 });
    this.physics.add.existing(this.exit, true);
  }

  private createPlayers(spawns: TilePoint[], selectedSkins: [SkinId, SkinId]): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) {
      return;
    }

    const controlSets: PlayerControls[] = [
      {
        left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      },
      {
        left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
        right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
        up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
        down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      },
    ];

    const playerCount = this.mode === 'multi' ? 2 : 1;

    for (let index = 0; index < playerCount; index += 1) {
      const spawn = spawns[index] ?? spawns[0] ?? { col: 1, row: 1 };
      const world = this.tileToWorld(spawn);
      const skin = skinCatalog.find((entry) => entry.id === selectedSkins[index]) ?? skinCatalog[0]!;
      const sprite = this.add.rectangle(world.x, world.y, TILE_SIZE - 16, TILE_SIZE - 16, skin.color);
      sprite.setStrokeStyle(4, skin.accent);
      const aura = this.add.circle(world.x, world.y, 18, 0x79ffac, 0.18).setDepth(sprite.depth - 1);
      this.decorations?.add(aura);
      this.physics.add.existing(sprite);
      const body = sprite.body as Phaser.Physics.Arcade.Body;
      body.setCollideWorldBounds(true);
      body.setSize(26, 26);
      body.setOffset((sprite.width - 26) / 2, (sprite.height - 26) / 2);
      this.players.push({ sprite, body, controls: controlSets[index]! });

      if (this.walls) {
        this.physics.add.collider(sprite, this.walls);
      }

      if (this.coins) {
        this.physics.add.overlap(sprite, this.coins, (_player, coin) => {
          this.collectCoin(coin as Phaser.GameObjects.Rectangle);
        });
      }

      if (this.exit) {
        this.physics.add.overlap(sprite, this.exit, () => {
          this.tryCompleteLevel();
        });
      }
    }
  }

  private createEnemies(spawns: TilePoint[]): void {
    spawns.forEach((spawn, index) => {
      const world = this.tileToWorld(spawn);
      const sprite = this.add.rectangle(world.x, world.y, TILE_SIZE - 14, TILE_SIZE - 14, index % 2 === 0 ? 0x7dffb2 : 0xdcefd8);
      sprite.setStrokeStyle(4, 0x0b140d);
      const aura = this.add.circle(world.x, world.y, 18, 0xbaffc5, 0.12).setDepth(sprite.depth - 1);
      this.decorations?.add(aura);
      this.physics.add.existing(sprite);
      const body = sprite.body as Phaser.Physics.Arcade.Body;
      body.setCollideWorldBounds(true);
      body.setSize(28, 28);
      body.setOffset((sprite.width - 28) / 2, (sprite.height - 28) / 2);
      if (this.walls) {
        this.physics.add.collider(sprite, this.walls);
      }
      this.players.forEach((player) => {
        this.physics.add.overlap(sprite, player.sprite, () => this.onPlayerCaught());
      });
      this.enemies.push({ sprite, body, path: [], repathAt: 0 });
    });
  }

  private collectCoin(coin: Phaser.GameObjects.Rectangle): void {
    if (!coin.active) {
      return;
    }

    coin.destroy();
    this.coinsRemaining -= 1;
    this.levelCoinsCollected += 1;
    if (this.coinsRemaining === 0) {
      this.updateHudText('All 3 coins claimed. Touch the exit to leave instantly.');
      return;
    }

    this.updateHudText('Coin collected. Keep sweeping the maze.');
  }

  private tryCompleteLevel(): void {
    if (!this.runActive || this.coinsRemaining > 0) {
      return;
    }

    addBankCoins(this.levelCoinsCollected);
    this.totalRunCoins += this.levelCoinsCollected;

    if (this.levelIndex === LEVELS.length - 1) {
      this.finishRun(true, `You escaped all 3 levels and banked ${this.totalRunCoins} coins.`);
      return;
    }

    this.levelIndex += 1;
    this.loadLevel(this.levelIndex);
  }

  private onPlayerCaught(): void {
    if (!this.runActive || this.time.now < this.hitCooldownUntil) {
      return;
    }

    this.hitCooldownUntil = this.time.now + 1200;
    this.lives -= 1;

    if (this.lives <= 0) {
      this.finishRun(false, `The hunters dragged you down in Level ${this.levelIndex + 1}.`);
      return;
    }

    this.loadLevel(this.levelIndex);
    this.updateHudText(`A hunter struck. ${this.lives} life${this.lives === 1 ? '' : 's'} remain.`);
  }

  private finishRun(victory: boolean, message: string): void {
    this.runActive = false;
    this.runOutcome = victory ? 'won' : 'lost';
    this.clearLevel();
    this.waitingText?.setVisible(true);
    this.endText?.setVisible(true);
    this.endText?.setText(victory ? `Victory\n${message}\nPress Start Game to run again.` : `Game Over\n${message}\nPress Start Game to try again.`);

    if (victory) {
      this.tweens.add({ targets: this.endText, scale: 1.08, duration: 650, yoyo: true, repeat: 4 });
    }

    this.updateHudText(message);
  }

  private updatePlayers(): void {
    this.players.forEach((player) => {
      let velocityX = 0;
      let velocityY = 0;

      if (player.controls.left.isDown) {
        velocityX = -PLAYER_SPEED;
      } else if (player.controls.right.isDown) {
        velocityX = PLAYER_SPEED;
      }

      if (player.controls.up.isDown) {
        velocityY = -PLAYER_SPEED;
      } else if (player.controls.down.isDown) {
        velocityY = PLAYER_SPEED;
      }

      if (velocityX !== 0 && velocityY !== 0) {
        const diagonalScale = Math.sqrt(0.5);
        velocityX *= diagonalScale;
        velocityY *= diagonalScale;
      }

      player.body.setVelocity(velocityX, velocityY);
    });
  }

  private updateEnemies(time: number): void {
    this.enemies.forEach((enemy) => {
      if (time >= enemy.repathAt || enemy.path.length === 0) {
        const target = this.findClosestPlayer(enemy.sprite.x, enemy.sprite.y);
        if (target) {
          const path = this.findPath(this.worldToTile(enemy.sprite.x, enemy.sprite.y), this.worldToTile(target.sprite.x, target.sprite.y));
          enemy.path = path.slice(1);
          enemy.repathAt = time + 320;
        }
      }

      const nextTile = enemy.path[0];
      if (!nextTile) {
        enemy.body.setVelocity(0, 0);
      } else {
        const nextWorld = this.tileToWorld(nextTile);
        const dx = nextWorld.x - enemy.sprite.x;
        const dy = nextWorld.y - enemy.sprite.y;
        const distance = Math.hypot(dx, dy);

        if (distance < 6) {
          enemy.path.shift();
          enemy.body.setVelocity(0, 0);
        } else {
          enemy.body.setVelocity((dx / distance) * ENEMY_SPEED, (dy / distance) * ENEMY_SPEED);
        }
      }

      this.players.forEach((player) => {
        const distanceToPlayer = Phaser.Math.Distance.Between(enemy.sprite.x, enemy.sprite.y, player.sprite.x, player.sprite.y);
        if (distanceToPlayer <= PLAYER_HIT_DISTANCE) {
          this.onPlayerCaught();
        }
      });
    });
  }

  private findClosestPlayer(x: number, y: number): PlayerAgent | undefined {
    return this.players.reduce<PlayerAgent | undefined>((closest, player) => {
      if (!closest) {
        return player;
      }

      const closestDistance = Phaser.Math.Distance.Between(x, y, closest.sprite.x, closest.sprite.y);
      const candidateDistance = Phaser.Math.Distance.Between(x, y, player.sprite.x, player.sprite.y);
      return candidateDistance < closestDistance ? player : closest;
    }, undefined);
  }

  private findPath(start: TilePoint, target: TilePoint): TilePoint[] {
    const queue: TilePoint[] = [start];
    const visited = new Set<string>([`${start.col},${start.row}`]);
    const previous = new Map<string, TilePoint>();
    const directions = [
      { col: 1, row: 0 },
      { col: -1, row: 0 },
      { col: 0, row: 1 },
      { col: 0, row: -1 },
    ];

    while (queue.length > 0) {
      const current = queue.shift() as TilePoint;
      if (current.col === target.col && current.row === target.row) {
        return this.rebuildPath(previous, start, target);
      }

      directions.forEach((direction) => {
        const next = { col: current.col + direction.col, row: current.row + direction.row };
        const key = `${next.col},${next.row}`;
        if (visited.has(key) || !this.isWalkable(next)) {
          return;
        }

        visited.add(key);
        previous.set(key, current);
        queue.push(next);
      });
    }

    return [start];
  }

  private rebuildPath(previous: Map<string, TilePoint>, start: TilePoint, target: TilePoint): TilePoint[] {
    const path: TilePoint[] = [target];
    let currentKey = `${target.col},${target.row}`;

    while (currentKey !== `${start.col},${start.row}`) {
      const parent = previous.get(currentKey);
      if (!parent) {
        return [start];
      }

      path.unshift(parent);
      currentKey = `${parent.col},${parent.row}`;
    }

    return path;
  }

  private isWalkable(tile: TilePoint): boolean {
    const row = this.currentMap[tile.row];
    if (!row) {
      return false;
    }

    return row[tile.col] !== '#';
  }

  private worldToTile(x: number, y: number): TilePoint {
    const firstRow = this.currentMap[0] ?? '';
    return {
      col: Phaser.Math.Clamp(Math.floor((x - ORIGIN_X) / TILE_SIZE), 0, Math.max(firstRow.length - 1, 0)),
      row: Phaser.Math.Clamp(Math.floor((y - ORIGIN_Y) / TILE_SIZE), 0, this.currentMap.length - 1),
    };
  }

  private tileToWorld(tile: TilePoint): { x: number; y: number } {
    return {
      x: ORIGIN_X + tile.col * TILE_SIZE + TILE_SIZE / 2,
      y: ORIGIN_Y + tile.row * TILE_SIZE + TILE_SIZE / 2,
    };
  }

  private updateHudText(message: string): void {
    this.hudStats?.setText([
      `Mode: ${this.mode === 'multi' ? 'Local Multiplayer' : 'Single Player'}`,
      `Lives: ${this.lives}`,
      `Coins left in maze: ${this.coinsRemaining}`,
      `Coins carried this level: ${this.levelCoinsCollected}`,
      `Coins banked this run: ${this.totalRunCoins}`,
      message,
    ]);

    publishStatus({
      active: this.runActive,
      level: this.levelIndex + 1,
      lives: this.lives,
      coinsInLevel: this.levelCoinsCollected,
      totalRunCoins: this.totalRunCoins,
      message,
      outcome: this.runOutcome,
    });
  }

  private toggleRules(forceState?: boolean): void {
    if (!this.rulesLayer) {
      return;
    }

    this.rulesOpen = forceState ?? !this.rulesOpen;
    this.rulesLayer.setVisible(this.rulesOpen);
  }

  private buildRulesOverlay(): Phaser.GameObjects.Container {
    const backdrop = this.add.rectangle(480, 320, 960, 640, 0x000000, 0.7).setInteractive();
    const panel = this.add.rectangle(480, 320, 640, 430, 0x122216);
    panel.setStrokeStyle(4, 0x86ffab);
    const title = this.add.text(480, 155, 'How To Play', {
      fontFamily: TITLE_FONT,
      fontSize: '30px',
      color: '#ecfff1',
    }).setOrigin(0.5);
    const body = this.add.text(
      480,
      275,
      'Objective\nEscape each maze while collecting every coin and staying ahead of the hunters.\n\nMovement\nSingle Player: WASD\nMultiplayer: Player 1 uses WASD, Player 2 uses Arrow Keys\n\nRules\nCollect all coins to unlock progress.\nTouching an enemy costs a life and restarts the current floor.\nBeat 3 levels to win.\nSpend banked coins in the sidebar to unlock skins.',
      {
        fontFamily: BODY_FONT,
        fontSize: '18px',
        color: '#c8ffd9',
        align: 'left',
        lineSpacing: 6,
        wordWrap: { width: 520 },
      },
    ).setOrigin(0.5);
    const close = this.add.text(480, 474, 'Close', {
      fontFamily: UI_FONT,
      fontSize: '20px',
      color: '#07110a',
      backgroundColor: '#86ffab',
      padding: { left: 18, right: 18, top: 10, bottom: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    close.on('pointerdown', () => this.toggleRules(false));
    backdrop.on('pointerdown', () => this.toggleRules(false));

    return this.add.container(0, 0, [backdrop, panel, title, body, close]).setDepth(100);
  }

  private clearLevel(): void {
    this.players.forEach((player) => player.sprite.destroy());
    this.enemies.forEach((enemy) => enemy.sprite.destroy());
    this.players = [];
    this.enemies = [];
    this.walls?.clear(true, true);
    this.coins?.clear(true, true);
    this.decorations?.clear(true, true);
    this.exit?.destroy();
    this.walls = undefined;
    this.coins = undefined;
    this.decorations = undefined;
    this.exit = undefined;
  }
}
