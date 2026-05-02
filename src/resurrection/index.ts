/**
 * @name Resurrection
 * @needsRefresh true
 * @deps atlasUtils, worldUtils, physicsUtils
 * @conflicts practice, editor
 */

import {
  type GameObject,
  type ObjectDefinition,
  ObjectType,
  type Player,
} from "@calcite-loader/types";
import type { HandleCollisionCallback } from "../worldUtils";
import { getObjects } from "./objects" with { type: "macro" };

const atlasUtils = api.lib<typeof import("../atlasUtils")>("atlasUtils");
const worldUtils = api.lib<typeof import("../worldUtils")>("worldUtils");
const physicsUtils = api.lib<typeof import("../physicsUtils")>("physicsUtils");

worldUtils.modifyObjectDefinitions(() => {
  return getObjects() as unknown as ObjectDefinition[];
});

// Stuff for buffering
let queueJump = false;

api.onStart(() => {
  const originalPushButton = window.gdScene._pushButton.bind(window.gdScene);
  window.gdScene._pushButton = (function (this: typeof window.gdScene) {
    if (!this._slideIn && !this._state.isDead && !this._state.upKeyDown) {
      queueJump = true;
    }
    originalPushButton();
  }).bind(window.gdScene);

  const originalReleaseButton = window.gdScene._releaseButton.bind(
    window.gdScene,
  );
  window.gdScene._releaseButton = (() => {
    queueJump = false;
    originalReleaseButton();
  }).bind(window.gdScene);

  const originalHitGround = window.gdScene._player.hitGround.bind(
    window.gdScene._player,
  );
  window.gdScene._player.hitGround = (() => {
    queueJump = false;
    originalHitGround();
  }).bind(window.gdScene._player);

  const originalRunRotateAction = window.gdScene._player.runRotateAction.bind(
    window.gdScene._player,
  );
  window.gdScene._player.runRotateAction = (() => {
    queueJump = false;
    originalRunRotateAction();
  }).bind(window.gdScene._player);
});

enum GameMode {
  CUBE,
  SHIP,
  WAVE,
}

let gamemode: GameMode = GameMode.CUBE;

declare global {
  interface Window {
    _resurrection: {
      getGamemode: () => GameMode;
    };
  }
}
window._resurrection = {
  getGamemode: () => gamemode,
};

const waveLayers: { sprite: Phaser.GameObjects.Image }[] = [];

api.onDeath(() => {
  gamemode = GameMode.CUBE;
  waveLayers.forEach((layer) => layer.sprite.visible = false);
  queueJump = false;
});

api.onShip(() => {
  gamemode = GameMode.SHIP;
  waveLayers.forEach((layer) => layer.sprite.visible = false);
  window.gdScene._player.setCubeVisible(true);
});
api.onCube(() => {
  gamemode = GameMode.CUBE;
  waveLayers.forEach((layer) => layer.sprite.visible = false);
  window.gdScene._player.setCubeVisible(true);
});

const flipGravity = (flipped: boolean, yMul: number = 0.5) => {
  if (window.gdScene._state.gravityFlipped === flipped) return;
  window.gdScene._state.gravityFlipped = flipped;
  window.gdScene._state.yVelocity *= yMul;
  window.gdScene._state.canJump = false;
  window.gdScene._state.onGround = false;
};

worldUtils.registerNewColliderType(
  ObjectType.PAD,
  "jump_pad",
  (definition, levelObject, x, y) => {
    const object = new worldUtils.GameObject(
      "jump_pad",
      x,
      y,
      definition.gridW * 60,
      definition.gridH * 60,
    ) as GameObject & { _objId: number };
    object._objId = levelObject.id;
    window.gdScene._level.objects.push(object);
    window.gdScene._level._addCollisionToSection(object);
  },
  ((object: GameObject & { _objId: number }) => {
    if (object.activated) return false;
    object.activated = true;

    let yVel = 0;
    let flip = false;
    if (object._objId === 35) { // Yellow
      yVel = 33;
    } else if (object._objId === 1332) { // Red
      yVel = 41;
    } else if (object._objId === 140) { // Pink
      yVel = 20.8;
    } else if (object._objId === 67) { // Blue
      yVel = 30;
      flip = true;
    }

    window.gdScene._state.isJumping = true;
    window.gdScene._state.canJump = false;
    window.gdScene._state.onGround = false;
    window.gdScene._state.yVelocity = yVel * window.gdScene._player.flipMod();
    window.gdScene._player.runRotateAction();

    if (flip) flipGravity(!window.gdScene._state.gravityFlipped);

    return true;
  }) as HandleCollisionCallback,
);

worldUtils.registerNewColliderType(
  ObjectType.RING,
  "jump_ring",
  (definition, levelObject, x, y) => {
    const object = new worldUtils.GameObject(
      "jump_ring",
      x,
      y,
      definition.gridW * 60 * 1.5,
      definition.gridH * 60 * 1.5,
    ) as GameObject & { _objId: number };
    object._objId = levelObject.id;
    window.gdScene._level.objects.push(object);
    window.gdScene._level._addCollisionToSection(object);
  },
  ((object: GameObject & { _objId: number }) => {
    if (!object.activated && queueJump && window.gdScene._state.upKeyDown) {
      const jumpForce = 22.360064;

      let yVel = 0;
      let flipAfter = false;
      let flipBefore = false;

      if (object._objId === 36) { // Yellow
        yVel = jumpForce;
      } else if (object._objId === 84) { // Blue
        yVel = jumpForce;
        flipAfter = true;
      } else if (object._objId === 1022) { // Green
        yVel = jumpForce;
        flipBefore = true;
      } else if (object._objId === 1333) { // Red
        yVel = jumpForce * 1.38;
      } else if (object._objId === 1330) { // Black
        yVel = -18;
      } else if (object._objId === 141) { // Pink
        yVel = jumpForce * 0.72;
      }

      object.activated = true;
      window.gdScene._state.isJumping = true;
      window.gdScene._state.onGround = false;
      window.gdScene._state.canJump = false;
      queueJump = false;
      window.gdScene._state.upKeyPressed = false;
      if (flipBefore) flipGravity(!window.gdScene._state.gravityFlipped);
      window.gdScene._state.yVelocity = window.gdScene._player.flipMod() * yVel;
      window.gdScene._player.runRotateAction();
      if (flipAfter) flipGravity(!window.gdScene._state.gravityFlipped);

      return true;
    }
    return false;
  }) as HandleCollisionCallback,
);

worldUtils.registerNewColliderType(
  ObjectType.PORTAL,
  (type) => type.startsWith("portal_"),
  (definition, _, x, y) => {
    const object = new worldUtils.GameObject(
      "portal_" + definition.sub,
      x,
      y,
      90,
      definition.gridH * 60,
    );
    window.gdScene._level.objects.push(object);
    window.gdScene._level._addCollisionToSection(object);
  },
  (object: GameObject & { portalY?: number }) => {
    if (object.activated) return false;
    object.activated = true;

    if (object.type === "portal_gravity_normal") {
      flipGravity(true, 0.6);
    } else if (object.type === "portal_gravity_flip") {
      flipGravity(false, 0.6);
    } else if (object.type === "portal_wave") {
      gamemode = GameMode.WAVE;
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
      window.gdScene._state.y = object.portalY ?? object.y;
      window.gdScene._level.setFlyMode(true, object.portalY ?? object.y);

      window.gdScene._player.setCubeVisible(false);
      window.gdScene._player.setShipVisible(false);
      waveLayers.forEach((layer) => layer.sprite.visible = true);
    }

    return true;
  },
);

// Custom gamemode stuff
api.onLoad(() => {
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

  waveLayers.push(waveSpriteLayer, waveOverlayLayer, waveGlowLayer);
  window.gdScene._player._allLayers.push(...waveLayers);

  const originalUpdateJump = window.gdScene._player.updateJump.bind(
    window.gdScene._player,
  );
  window.gdScene._player.updateJump = function (this: Player, delta: number) {
    if (gamemode === GameMode.CUBE || gamemode === GameMode.SHIP) {
      originalUpdateJump(delta);
    } else if (gamemode === GameMode.WAVE) {
      this.p.yVelocity = (this.p.upKeyDown
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
    }
  };
});

// Fix collisions when gravity flipped
api.patchMethod("checkCollisions", (code) => {
  // Wave Hitbox
  code = code.replaceAll(
    /([^_])0x1e/g,
    `$1(window._resurrection.getGamemode() === ${GameMode.WAVE} ? 9 : 30)`,
  );

  code = code.replace(
    "&&this['p']",
    "&&({isFlying:this.p.isFlying||this.p.gravityFlipped})",
  );

  code = code.replace(
    "&&(this['p']",
    "&&(!this.p.gravityFlipped||this.p.isFlying)&&(this['p']",
  );

  return code;
});

// Fix player rendering when gravity flipped
api.patchMethod("syncSprites", (code) => {
  const offsetVarName = code.match(/const (_0x[\da-f]+)=0xa,/)?.[1]!;

  const index1 = code.lastIndexOf(offsetVarName);
  code = code.slice(0, index1) +
    `(this.p.gravityFlipped ? -40 : ${offsetVarName})` +
    code.slice(index1 + offsetVarName.length);

  const index2 = code.lastIndexOf(offsetVarName, index1 - 1);
  code = code.slice(0, index2) +
    `(this.p.gravityFlipped ? -40 : ${offsetVarName})` +
    code.slice(index2 + offsetVarName.length);

  return code;
});

api.onUpdate(() => {
  if (gamemode === GameMode.SHIP) {
    for (const layer of window.gdScene._player._playerLayers) {
      if (!layer) continue;
      layer.sprite.scaleY = window.gdScene._state.gravityFlipped ? -0.55 : 0.55;
    }

    for (const layer of window.gdScene._player._shipLayers) {
      if (!layer) continue;
      layer.sprite.scaleY = window.gdScene._state.gravityFlipped ? -1 : 1;
    }
  } else if (gamemode === GameMode.CUBE) {
    for (const layer of window.gdScene._player._playerLayers) {
      if (!layer) continue;
      layer.sprite.scaleY = window.gdScene._state.gravityFlipped ? -1 : 1;
    }
  }
}, "after");

// Steal assets from Web Dashers :)
const sheetBaseUrl =
  "https://raw.githubusercontent.com/web-dashers/web-dashers.github.io/refs/heads/main/assets/sheets/";
atlasUtils.addCustomObjectAtlas(
  "WebDashers1",
  sheetBaseUrl + "GJ_GameSheet.png",
  sheetBaseUrl + "GJ_GameSheet.json",
);
atlasUtils.addCustomObjectAtlas(
  "WebDashers2",
  sheetBaseUrl + "GJ_GameSheet02.png",
  sheetBaseUrl + "GJ_GameSheet02.json",
);
atlasUtils.addCustomObjectAtlas(
  "WebDashersDart",
  sheetBaseUrl + "player_dart_00.png",
  sheetBaseUrl + "player_dart_00.json",
);
