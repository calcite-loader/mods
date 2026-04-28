/**
 * @name Resurrection
 * @needsRefresh true
 * @deps atlasUtils, worldUtils
 */

import { ObjectType } from "@calcite-loader/types";

const atlasUtils = api.lib<typeof import("./atlasUtils")>("atlasUtils");
const worldUtils = api.lib<typeof import("./worldUtils")>("worldUtils");

worldUtils.modifyObjectDefinitions((definitions) => {
  // Fix Yellow Pad Stuff
  definitions[35]!.gridW = 0.8333333134651184;
  definitions[35]!.gridH = 0.13333334028720856;

  return definitions;
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

api.onDeath(() => {
  queueJump = false;
});

worldUtils.registerNewColliderType(
  ObjectType.PAD,
  "jump_pad",
  (definition, x, y) => {
    const object = new worldUtils.GameObject(
      "jump_pad",
      x,
      y,
      definition.gridW * 60,
      definition.gridH * 60,
    );
    window.gdScene._level.objects.push(object);
    window.gdScene._level._addCollisionToSection(object);
  },
  (object) => {
    if (object.activated) return false;
    object.activated = true;

    window.gdScene._state.isJumping = true;
    window.gdScene._state.canJump = false;
    window.gdScene._state.onGround = false;
    window.gdScene._state.yVelocity = 32 * window.gdScene._player.flipMod();
    window.gdScene._player.runRotateAction();

    return true;
  },
);

worldUtils.registerNewColliderType(
  ObjectType.RING,
  "jump_ring",
  (definition, x, y) => {
    const object = new worldUtils.GameObject(
      "jump_ring",
      x,
      y,
      definition.gridW * 60,
      definition.gridH * 60,
    );
    window.gdScene._level.objects.push(object);
    window.gdScene._level._addCollisionToSection(object);
  },
  (object) => {
    if (!object.activated && queueJump && window.gdScene._state.upKeyDown) {
      object.activated = true;
      window.gdScene._state.isJumping = true;
      window.gdScene._state.onGround = false;
      window.gdScene._state.canJump = false;
      queueJump = false;
      window.gdScene._state.upKeyPressed = false;
      window.gdScene._state.yVelocity = window.gdScene._player.flipMod() *
        22.360064;

      return true;
    }
    return false;
  },
);

worldUtils.registerNewColliderType(
  ObjectType.PORTAL,
  (type) => type.startsWith("portal_"),
  (definition, x, y) => {
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
  (object) => {
    if (object.activated) return false;
    object.activated = true;

    const flipGravity = (flipped: boolean) => {
      if (window.gdScene._state.gravityFlipped === flipped) return;
      window.gdScene._state.gravityFlipped = flipped;
      window.gdScene._state.yVelocity *= 0.5;
      window.gdScene._state.canJump = false;
      window.gdScene._state.onGround = false;
    };

    if (object.type === "portal_gravity_normal") {
      flipGravity(true);
    } else if (object.type === "portal_gravity_flip") {
      flipGravity(false);
    }

    return true;
  },
);

// Fix collisions when gravity flipped
api.patchMethod("checkCollisions", (code) => {
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
  if (window.gdScene._state.isFlying) {
    for (const layer of window.gdScene._player._playerLayers) {
      if (!layer) continue;
      layer.sprite.scaleY = window.gdScene._state.gravityFlipped ? -0.55 : 0.55;
    }

    for (const layer of window.gdScene._player._shipLayers) {
      if (!layer) continue;
      layer.sprite.scaleY = window.gdScene._state.gravityFlipped ? -1 : 1;
    }
  } else {
    for (const layer of window.gdScene._player._playerLayers) {
      if (!layer) continue;
      layer.sprite.scaleY = window.gdScene._state.gravityFlipped ? -1 : 1;
    }
  }
}, "after");

// Steal assets from Web Dashers :)
const sheetBaseUrl =
  "https://raw.githubusercontent.com/web-dashers/web-dashers.github.io/refs/heads/main/assets/sheets/GJ_GameSheet";
atlasUtils.addCustomObjectAtlas(
  "WebDashers1",
  sheetBaseUrl + ".png",
  sheetBaseUrl + ".json",
);
atlasUtils.addCustomObjectAtlas(
  "WebDashers2",
  sheetBaseUrl + "02.png",
  sheetBaseUrl + "02.json",
);
