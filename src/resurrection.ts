/**
 * @name Resurrection
 * @needsRefresh true
 * @deps atlasUtils
 */

import type { GameObject } from "@calcite-loader/types";

const atlasUtils = api.lib<typeof import("./atlasUtils")>("atlasUtils");

enum ObjectType {
  SOLID = "solid",
  HAZARD = "hazard",
  DECORATIVE = "deco",
  PORTAL = "portal",
  PAD = "pad",
  RING = "ring",
  TRIGGER = "trigger",
  SPEED = "speed",
  FLY = "fly",
  CUBE = "cube",
}

interface ObjectDefinition {
  type: ObjectType;
  frame: string;
  gridW: number;
  gridH: number;
  sub?: string;
}

declare global {
  interface Window {
    _resurrection: {
      objectDefinitions: Record<number, ObjectDefinition>;
      GameObject: {
        new (type: string, x: number, y: number, w: number, h: number): {
          type: string; // TODO: Enum type?
          x: number;
          y: number;
          w: number;
          h: number;
          activated: boolean;
        };
      };

      addPadCollider: (
        definition: ObjectDefinition,
        x: number,
        y: number,
      ) => void;
      onPadCollision: () => void;

      addRingCollider: (
        definition: ObjectDefinition,
        x: number,
        y: number,
      ) => void;
      onRingCollision: () => boolean;

      addPortalCollider: (
        definition: ObjectDefinition,
        x: number,
        y: number,
      ) => void;
      onPortalCollision: (object: GameObject) => void;
    };
  }
}
(window._resurrection as any) = {};

// Make object definitions globally available via window.objectDefinitions
api.patchScript("index-game.js", (code) => {
  const match = code.match(
    /,\s*(\w+)\s*=\s*{\s*0x1:\s*{\s*'type'\s*:\s*\w+\s*,\s*'frame'/,
  );
  if (!match || !match[1]) return code;
  const index = code.indexOf(";", match.index) + 1;
  return code.slice(0, index) +
    `window._resurrection.objectDefinitions = ${match[1]};` +
    code.slice(index);
});

let _objectDefinitions: typeof window._resurrection.objectDefinitions;
Object.defineProperty(window._resurrection, "objectDefinitions", {
  get: () => _objectDefinitions,
  set: (definitions: typeof window._resurrection.objectDefinitions) => {
    if (!_objectDefinitions) {
      // Fix Yellow Pad Stuff
      definitions[35]!.gridH = 0.13333334028720856;
      definitions[35]!.gridW = 0.8333333134651184;
    }
    _objectDefinitions = definitions;
  },
});

window._resurrection.addPadCollider = (
  definition: ObjectDefinition,
  x: number,
  y: number,
) => {
  const object = new window._resurrection.GameObject(
    "jump_pad",
    x,
    y,
    definition.gridW * 60,
    definition.gridH * 60,
  );
  window.gdScene._level.objects.push(object);
  window.gdScene._level._addCollisionToSection(object);
};

window._resurrection.addRingCollider = (
  definition: ObjectDefinition,
  x: number,
  y: number,
) => {
  const object = new window._resurrection.GameObject(
    "jump_ring",
    x,
    y,
    definition.gridW * 60,
    definition.gridH * 60,
  );
  window.gdScene._level.objects.push(object);
  window.gdScene._level._addCollisionToSection(object);
};

window._resurrection.addPortalCollider = (
  definition: ObjectDefinition,
  x: number,
  y: number,
) => {
  const object = new window._resurrection.GameObject(
    "portal_" + definition.sub,
    x,
    y,
    90,
    definition.gridH * 60,
  );
  window.gdScene._level.objects.push(object);
  window.gdScene._level._addCollisionToSection(object);
};

let gameObjectClassName: string;

api.patchMethod("_spawnLevelObjects", (code) => {
  const gameObjectRegex = /new\s+(?!Set\s*\()(\w+)/;
  gameObjectClassName = code.match(gameObjectRegex)?.[1]!;

  const index = code.indexOf("}", code.search(gameObjectRegex)) + 1;
  const definitionVarName = code.match(
    /for\s*\(\s*let\s+_0x[\da-f]+\s+of\s+_0x[\da-f]+\s*\)\s*\{\s*let\s+(_0x[\da-f]+)/,
  )?.[1]!;

  const xName = code.match(/let\s+(_0x[\da-f]+)\s*=\s*(?:0x)?2\s*\*/)?.[1]!;
  const yName = code.match(/,\s*(_0x[\da-f]+)\s*=\s*(?:0x)?2\s*\*/)?.[1]!;

  return `${
    code.slice(0, index)
  } else if (${definitionVarName}.type === "${ObjectType.PAD}") { window._resurrection.addPadCollider(${definitionVarName}, ${xName}, ${yName}) } else if (${definitionVarName}.type === "${ObjectType.RING}") { window._resurrection.addRingCollider(${definitionVarName}, ${xName}, ${yName}) } else if (${definitionVarName}.type === "${ObjectType.PORTAL}" && ["gravity_flip", "gravity_normal"].includes(${definitionVarName}.sub)) { window._resurrection.addPortalCollider(${definitionVarName}, ${xName}, ${yName}) } ${
    code.slice(index)
  }`;
});

api.patchScript("index-game.js", (code) => {
  const baseIndex = code.indexOf(`class ${gameObjectClassName}`);
  const endIndex = code.indexOf("}}", baseIndex) + 2;
  return code.slice(0, endIndex) +
    `;window._resurrection.GameObject = ${gameObjectClassName};` +
    code.slice(endIndex);
});

api.patchMethod("checkCollisions", (code) => {
  code = code.replace(
    "&&this['p']",
    "&&({isFlying:this.p.isFlying||this.p.gravityFlipped})",
  );

  code = code.replace(
    "&&(this['p']",
    "&&(!this.p.gravityFlipped||this.p.isFlying)&&(this['p']",
  );

  return code.replace(
    /(if\s*\(\s*(_0x[\da-f]+)\s*\[\s*_0x[\da-f]+\s*\(\s*0x[\da-f]+\s*\)\s*\]\s*===\s*\w+\s*\)\s*return\s+void\s+this\s*\[\s*_0x[\da-f]+\s*\(\s*0x[\da-f]+\s*\)\s*\]\s*\(\s*\)\s*;)/,
    "$1 if ($2.type === 'jump_pad' && !$2.activated) {$2.activated = true;window._resurrection.onPadCollision();return;}; if ($2.type === 'jump_ring' && !$2.activated) {$2.activated = window._resurrection.onRingCollision();return;}; if ($2.type.startsWith('portal_') && $2 !== 'portal_fly' && $2 !== 'portal_cube' && !$2.activated) {$2.activated = true;window._resurrection.onPortalCollision($2);return;}",
  );
});

window._resurrection.onPadCollision = () => {
  window.gdScene._state.isJumping = true;
  window.gdScene._state.canJump = false;
  window.gdScene._state.onGround = false;
  window.gdScene._state.yVelocity = 32 * window.gdScene._player.flipMod();
  window.gdScene._player.runRotateAction();
};

let queueJump = false;

window._resurrection.onRingCollision = () => {
  if (queueJump && window.gdScene._state.upKeyDown) {
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
};

window._resurrection.onPortalCollision = (object: GameObject) => {
  const flipGravity = (flipped: boolean) => {
    if (window.gdScene._state.gravityFlipped === flipped) return;
    window.gdScene._state.gravityFlipped = flipped;
    window.gdScene._state.yVelocity *= 0.5;
    window.gdScene._state.canJump = false;
    window.gdScene._state.onGround = false;
  };

  if (object.type === "portal_gravity_normal") {
    flipGravity(true);
    return;
  }
  if (object.type === "portal_gravity_flip") {
    flipGravity(false);
  }
};

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
