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
import {
  GameMode,
  gamemode,
  gamemodes,
  Orb,
  Pad,
  setGamemode,
} from "./gamemodes";
import "./assets";
import { flipGravity } from "./utils";

const worldUtils = api.lib<typeof import("../worldUtils")>("worldUtils");

worldUtils.modifyObjectDefinitions(() => {
  return getObjects() as unknown as ObjectDefinition[];
});

let pendingVelocity: number | null = null;

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

api.onDeath(() => {
  queueJump = false;
});

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
    return object;
  },
  ((object: GameObject & { _objId: number }) => {
    if (object.activated) return false;
    object.activated = true;

    const padInfo = gamemodes[gamemode].padInfo[object._objId as Pad];

    if (padInfo) {
      window.gdScene._state.isJumping = true;
      window.gdScene._state.canJump = false;
      window.gdScene._state.onGround = false;

      if (padInfo.yVel) {
        window.gdScene._state.yVelocity = padInfo.yVel *
          window.gdScene._player.flipMod();
      }
      if (padInfo.pendingVel) pendingVelocity = padInfo.pendingVel;
      if (padInfo.flip) flipGravity(!window.gdScene._state.gravityFlipped);

      window.gdScene._player.runRotateAction();
    }

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
      definition.gridW * 60,
      definition.gridH * 60,
    ) as GameObject & { _objId: number };
    object._objId = levelObject.id;
    return object;
  },
  ((object: GameObject & { _objId: number }) => {
    if (!object.activated && queueJump && window.gdScene._state.upKeyDown) {
      object.activated = true;
      window.gdScene._state.isJumping = true;
      window.gdScene._state.onGround = false;
      window.gdScene._state.canJump = false;
      queueJump = false;
      window.gdScene._state.upKeyPressed = false;

      const orbInfo = gamemodes[gamemode].orbInfo[object._objId as Orb];
      if (orbInfo) {
        const fm = window.gdScene._player.flipMod();
        if (orbInfo.flipBefore) {
          flipGravity(!window.gdScene._state.gravityFlipped);
        }
        if (orbInfo.yVel) {
          window.gdScene._state.yVelocity = fm * orbInfo.yVel;
        }
        window.gdScene._player.runRotateAction();
        if (orbInfo.flipAfter) {
          flipGravity(!window.gdScene._state.gravityFlipped);
        }
      }

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
    return object;
  },
  (object: GameObject & { portalY?: number }) => {
    if (object.activated) return false;
    object.activated = true;

    if (object.type === "portal_gravity_normal") {
      flipGravity(true);
    } else if (object.type === "portal_gravity_flip") {
      flipGravity(false);
    } else {
      for (const [type, info] of Object.entries(gamemodes)) {
        if (info.portal === object.type && info.enterGamemode) {
          const previousGamemode = gamemode;
          setGamemode(Number(type));
          info.enterGamemode(object.portalY ?? object.y);
          if (info.layers) {
            info.layers.forEach((layer) => layer.sprite.visible = true);
          }
          if (gamemodes[previousGamemode].layers) {
            gamemodes[previousGamemode].layers.forEach((layer) =>
              layer.sprite.visible = false
            );
          }
          break;
        }
      }
    }

    return true;
  },
);

// Custom gamemode stuff
api.onLoad(() => {
  const originalUpdateJump = window.gdScene._player.updateJump.bind(
    window.gdScene._player,
  );
  window.gdScene._player.updateJump = function (this: Player, delta: number) {
    if (pendingVelocity != null) {
      this.p.yVelocity = pendingVelocity;
      pendingVelocity = null;
    }

    if (gamemode === GameMode.CUBE || gamemode === GameMode.SHIP) {
      originalUpdateJump(delta);
    } else gamemodes[gamemode].updateJump?.call(this, delta);
  };
});

// Fix collisions when gravity flipped
api.patchMethod("checkCollisions", (code) => {
  // Wave Hitbox
  code = code.replaceAll(
    /([^_])0x1e/g,
    `$1(window._resurrection.getGamemode().hitboxSize)`,
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
  const offsetVarName = code.match(/const\s+(_0x[\da-f]+)=0xa,/)?.[1]!;

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
