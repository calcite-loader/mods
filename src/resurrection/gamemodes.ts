import type { Player } from "@calcite-loader/types";
import { flipGravity, jumpForce } from "./utils";

const physicsUtils = api.lib<typeof import("../physicsUtils")>("physicsUtils");
const atlasUtils = api.lib<typeof import("../atlasUtils")>("atlasUtils");

const centerX = 419;
const groundY = 460;

export enum GameMode {
  CUBE,
  SHIP,
  WAVE,
  BALL,
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
  [GameMode.BALL]: {
    layers: [],
    initLayers() {
      const ballSpriteLayer = atlasUtils.createSpriteLayer(
        window.gdScene,
        centerX,
        groundY - window.gdScene._state.y,
        "player_ball_00_001.png",
        10,
        false,
      );
      ballSpriteLayer.sprite.setTint(0x00ff00);

      const ballOverlayLayer = atlasUtils.createSpriteLayer(
        window.gdScene,
        centerX,
        groundY - window.gdScene._state.y,
        "player_ball_00_2_001.png",
        8,
        false,
      );
      ballOverlayLayer.sprite.setTint(0x00ffff);

      const ballGlowLayer = atlasUtils.createSpriteLayer(
        window.gdScene,
        centerX,
        groundY - window.gdScene._state.y,
        "player_ball_00_glow_001.png",
        9,
        false,
      );
      ballGlowLayer.sprite.setTint(0x00ffff);

      this.layers?.push(ballSpriteLayer, ballOverlayLayer, ballGlowLayer);
    },
    hitboxSize: 30,
    updateJump: function (this: Player, delta: number) {
      if (this.p.upKeyDown && this.p.canJump) {
        this.p.upKeyDown = false;
        this.p.yVelocity = this.flipMod() * jumpForce * 0.6;
        flipGravity(!this.p.gravityFlipped);
        this.p.onGround = false;
        this.p.canJump = false;
        return;
      }

      if (this.playerIsFalling()) {
        this.p.canJump = false;
      }

      this.p.yVelocity -= physicsUtils.getJumpVelocity() * 0.6 * delta *
        this.flipMod();
      this.p.yVelocity = Math.min(Math.max(this.p.yVelocity, -30), 30);

      if (
        this.playerIsFalling() &&
        Math.abs(this.p.yVelocity) > physicsUtils.getJumpVelocity() * 2
      ) {
        this.p.onGround = false;
      }
    },
    portal: "portal_ball",
    enterGamemode(portalY) {
      window.gdScene._state.onGround = false;
      window.gdScene._state.canJump = false;
      window.gdScene._state.isJumping = false;
      window.gdScene._state.isFlying = false;
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
  for (const info of Object.values(gamemodes)) {
    if (info.layers) {
      info.layers.forEach((layer) => layer.sprite.visible = false);
    }
  }
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
