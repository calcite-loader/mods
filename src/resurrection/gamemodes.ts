import type { Player } from "@calcite-loader/types";

const physicsUtils = api.lib<typeof import("../physicsUtils")>("physicsUtils");
const atlasUtils = api.lib<typeof import("../atlasUtils")>("atlasUtils");

export enum GameMode {
  CUBE,
  SHIP,
  WAVE,
}

export interface GameModeInfo {
  layers?: { sprite: Phaser.GameObjects.Image }[];
  initLayers?: () => void;
  hitboxSize: number;
  updateJump?: (delta: number) => void;
  portal?: string;
  enterGamemode?: (portalY: number) => void;
}

export let gamemode: GameMode = GameMode.CUBE;
export const gamemodes: Record<GameMode, GameModeInfo> = {
  [GameMode.CUBE]: {
    hitboxSize: 30,
  },
  [GameMode.SHIP]: {
    hitboxSize: 30,
  },
  [GameMode.WAVE]: {
    layers: [],
    initLayers() {
      // Load super duper cool custom assets :)
      const centerX = 419;
      const groundY = 460;

      const waveSpriteLayer = atlasUtils.createSpriteLayer(
        window.gdScene,
        centerX,
        groundY - window.gdScene._state.y,
        "player_dart_00_001.png",
        10,
        false,
      );
      waveSpriteLayer.sprite.setScale(0.42).setTint(0x00ff00);

      const waveOverlayLayer = atlasUtils.createSpriteLayer(
        window.gdScene,
        centerX,
        groundY - window.gdScene._state.y,
        "player_dart_00_2_001.png",
        8,
        false,
      );
      waveOverlayLayer.sprite.setScale(0.42).setTint(0x00ffff);

      const waveGlowLayer = atlasUtils.createSpriteLayer(
        window.gdScene,
        centerX,
        groundY - window.gdScene._state.y,
        "player_dart_00_glow_001.png",
        9,
        false,
      );
      waveGlowLayer.sprite.setScale(0.42).setTint(0x00ffff);

      this.layers?.push(waveSpriteLayer, waveOverlayLayer, waveGlowLayer);
    },
    hitboxSize: 9,
    updateJump: function (this: Player) {
      this.p.yVelocity =
        (this.p.upKeyDown
          ? physicsUtils.getPlayerSpeed()
          : -physicsUtils.getPlayerSpeed()) * this.flipMod();
      this._rotation = this.p.upKeyDown ? -Math.PI / 4 : Math.PI / 4;

      if (this.p.onGround) {
        if (this.p.onCeiling ? this.p.yVelocity < 0 : this.p.yVelocity > 0) {
          this.p.onGround = false;
        } else {
          this.p.yVelocity = 0;
          this._rotation = 0;
        }
      }
    },
    portal: "portal_wave",
    enterGamemode(portalY) {
      window.gdScene._state.isFlying = false;
      window.gdScene._state.isJumping = false;
      window.gdScene._state.canJump = false;
      window.gdScene._state.onGround = false;
      window.gdScene._state.onCeiling = false;
      window.gdScene._state.yVelocity = 0;
      window.gdScene._player.stopRotation();
      window.gdScene._player._rotation = 0;
      window.gdScene.toggleGlitter(false);
      window.gdScene._player._streak.stop();
      window.gdScene._player._streak.reset();
      window.gdScene._state.y = portalY;
      window.gdScene._level.setFlyMode(true, portalY);

      window.gdScene._player.setCubeVisible(false);
      window.gdScene._player.setShipVisible(false);
    },
  },
} as const;

export const setGamemode = (newGamemode: GameMode) => gamemode = newGamemode;

declare global {
  interface Window {
    _resurrection: {
      getGamemode: () => GameModeInfo;
    };
  }
}
window._resurrection = {
  getGamemode: () => gamemodes[gamemode],
};

api.onDeath(() => {
  gamemode = GameMode.CUBE;
});

api.onCube(() => {
  gamemode = GameMode.CUBE;
  window.gdScene._player.setCubeVisible(true);
  for (const info of Object.values(gamemodes)) {
    if (info.layers) {
      info.layers.forEach((layer) => layer.sprite.visible = false);
    }
  }
});

api.onShip(() => {
  gamemode = GameMode.SHIP;
  window.gdScene._player.setCubeVisible(true);
  for (const info of Object.values(gamemodes)) {
    if (info.layers) {
      info.layers.forEach((layer) => layer.sprite.visible = false);
    }
  }
});

api.onLoad(() => {
  for (const gamemode of Object.values(gamemodes)) {
    if (gamemode.initLayers && gamemode.layers) {
      gamemode.initLayers();
      window.gdScene._player._allLayers.push(...gamemode.layers);
    }
  }
});
