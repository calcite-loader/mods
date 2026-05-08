/*
 * @name Platformer Mode
 * @needsRefresh true
 * @deps physicsUtils
 * @conflicts hitboxes
 */

import type { GameObject } from "@calcite-loader/types";

declare global {
  interface Window {
    _platformer: {
      handleWallCollision: (object: GameObject) => boolean;
      handleHitHead: (object: GameObject) => void;
      playerDirection: 1 | -1 | 0;
      onJump: () => void;
    };
  }
}
(window._platformer as any) = {};

const defaultSpeed = 11.540004;

window._platformer.playerDirection = 0;

const physicsUtils = api.lib<typeof import("./physicsUtils")>("physicsUtils");

api.patchMethod("runRotateAction", (code) => {
  return code.replace(
    /Math(?:\['PI'\]|\.PI)/,
    "Math.PI*window._platformer.playerDirection",
  );
});

api.patchMethod("checkCollisions", (code) => {
  if (window.location.host === "web-dashers.github.io") {
    // Wall Collisions
    code = code.replace(
      /if\s*\(\s*iscolliding\s*&&\s*!\s*isstandingOnAPlatform\s*\)\s*{/,
      "if (!isstandingOnAPlatform) { window._platformer.handleWallCollision(gameObj); continue;",
    );

    // Head Collisions (broken on Web Dashers rn)
    code = code.replaceAll(
      /&&\s*this\.p\.isFlying\s*\)\s*{/g,
      ") { window._platformer.handleHitHead(gameObj); continue;",
    );
  } else {
    const objectVarName = code.match(/for\s*\(\s*let\s+(_0x[\da-f]+)/)?.[1];

    // Wall Collisions
    code = code.replace(
      /if\s*\(\s*_0x[\da-f]+\s*&&\s*!\s*(_0x[a-f\d]+)\s*\)\s*return\s+void\s+this\s*\[\s*_0x[\da-f]+\s*\(\s*0x[\da-f]+\s*\)\s*\]\s*\(\s*\)/,
      `if (!$1) { if (window._platformer.handleWallCollision(${objectVarName})) continue }`,
    );

    // Head Collisions
    const index = code.indexOf("{", code.indexOf("&&this['p']")) + 1;
    code = code.slice(0, index) +
      `window._platformer.handleHitHead(${objectVarName});continue;` +
      code.slice(index);

    code = code.replace(
      "&&this['p']",
      "&&({isFlying:true})",
    );
  }

  return code;
});

let playerWorldX: number;

window._platformer.handleWallCollision = (object) => {
  const checkIsColliding = () => {
    const worldX = playerWorldX;
    const playerY = window.gdScene._state.y;

    const objectLeft = object.x - object.w / 2,
      objectRight = object.x + object.w / 2,
      objectBottom = object.y - object.h / 2,
      objectTop = object.y + object.h / 2;

    return worldX + 29.5 > objectLeft &&
      worldX - 29.5 < objectRight &&
      playerY + 9 > objectBottom &&
      playerY - 9 < objectTop;
  };

  if (!checkIsColliding()) return false;

  while (checkIsColliding()) {
    playerWorldX -= window._platformer.playerDirection;
  }

  return true;
};

window._platformer.handleHitHead = (object) => {
  window.gdScene._state.y = window.gdScene._state.gravityFlipped
    ? ((object.y + object.h / 2) + 30)
    : ((object.y - object.h / 2) - 30);

  if (window.gdScene._state.isFlying) {
    window.gdScene._player.hitGround();
    window.gdScene._state.onCeiling = true;
    if (window.gdScene._state.gravityFlipped) {
      window.gdScene._state.collideTop = object.y + object.h / 2;
    } else {
      window.gdScene._state.collideBottom = object.y - object.h / 2;
    }
    return;
  }

  window.gdScene._state.yVelocity = 0;
};

let isVerticalJump = false;
let cancelVerticalJump: () => void;

api.onStart(() => {
  window.gdScene._playerWorldX = 0;
  physicsUtils.setPlayerSpeed(0);

  playerWorldX = window.gdScene._playerWorldX;
  Object.defineProperty(window.gdScene, "_playerWorldX", {
    get: () => playerWorldX,
    set: (newX) => {
      playerWorldX = newX;
      // I know it's inefficient but patching GameScene.update is a pain
      window.gdScene._player.checkCollisions(playerWorldX - 419);
    },
  });

  const leftKey = window.gdScene.input.keyboard!.addKey(
    Phaser.Input.Keyboard.KeyCodes.LEFT,
  );
  const rightKey = window.gdScene.input.keyboard!.addKey(
    Phaser.Input.Keyboard.KeyCodes.RIGHT,
  );
  const aKey = window.gdScene.input.keyboard!.addKey(
    Phaser.Input.Keyboard.KeyCodes.A,
  );
  const dKey = window.gdScene.input.keyboard!.addKey(
    Phaser.Input.Keyboard.KeyCodes.D,
  );
  const wKey = window.gdScene.input.keyboard!.addKey(
    Phaser.Input.Keyboard.KeyCodes.W,
  );

  const isLeftDown = () => leftKey.isDown || aKey.isDown;
  const isRightDown = () => rightKey.isDown || dKey.isDown;

  const updateMovement = () => {
    const oldDireciton = window._platformer.playerDirection;

    if (isLeftDown() && isRightDown()) {
      window._platformer.playerDirection = 0;
    } else if (isLeftDown()) {
      window._platformer.playerDirection = -1;
    } else if (isRightDown()) {
      window._platformer.playerDirection = 1;
    } else {
      window._platformer.playerDirection = 0;
    }

    physicsUtils.setPlayerSpeed(
      defaultSpeed * window._platformer.playerDirection,
    );

    if (
      !window.gdScene._state.onGround && isVerticalJump &&
      window._platformer.playerDirection != oldDireciton
    ) {
      isVerticalJump = false;
      cancelVerticalJump();
      window.gdScene._player.runRotateAction();
    }
  };

  [leftKey, rightKey, aKey, dKey].forEach((key) => {
    key.on("down", updateMovement);
    key.on("up", updateMovement);
  });

  wKey.on("down", () => window.gdScene._pushButton());
  wKey.on("up", () => window.gdScene._releaseButton());

  if (api.loadedMods.includes("gamepad")) {
    api.sendMessage("gamepad", (gamepad: Gamepad) => {
      api.onUpdate(() => {
        let oldDireciton = window._platformer.playerDirection;

        if (
          (gamepad.buttons[14]?.pressed || isLeftDown()) &&
          (gamepad.buttons[15]?.pressed || isRightDown())
        ) {
          window._platformer.playerDirection = 0;
        } else if (gamepad.buttons[14]?.pressed || isLeftDown()) {
          window._platformer.playerDirection = -1;
        } else if (gamepad.buttons[15]?.pressed || isRightDown()) {
          window._platformer.playerDirection = 1;
        } else {
          window._platformer.playerDirection = 0;
        }

        physicsUtils.setPlayerSpeed(
          defaultSpeed * window._platformer.playerDirection,
        );

        if (
          isVerticalJump &&
          window._platformer.playerDirection != oldDireciton &&
          !window.gdScene._state.onGround
        ) {
          isVerticalJump = false;
          cancelVerticalJump();
          window.gdScene._player.runRotateAction();
        }
      }, "before");
    });
  }
});

api.patchMethod("updateJump", (code) => {
  return code.replace(
    /(this\['p'\]\[_0x[\da-f]+\(0x[\da-f]+\)\]&&this\['p'\]\[_0x[\da-f]+\(0x[\da-f]+\)\]\))/,
    "$1 window._platformer.onJump(),",
  );
});

window._platformer.onJump = () => {
  isVerticalJump = window._platformer.playerDirection == 0;

  if (window._platformer.playerDirection != 0) return;

  const chains: Phaser.Tweens.TweenChain[] = [];

  const validLayers: Phaser.GameObjects.Image[] = [];
  for (const layer of window.gdScene._player._playerLayers) {
    if (!layer) continue;
    validLayers.push(layer.sprite);

    if (
      (window.gdScene._player._rotation / Math.PI) % 1 > 0.6 ||
      (window.gdScene._player._rotation / Math.PI) % 1 < 0.4
    ) {
      chains.push(window.gdScene.tweens.chain({
        targets: layer.sprite,
        tweens: [
          {
            scaleX: 0.8,
            scaleY: 1.35,
            duration: 150,
            ease: Phaser.Math.Easing.Sine.InOut,
          },
          {
            scaleX: 1.1,
            scaleY: 0.9,
            duration: 125,
            ease: Phaser.Math.Easing.Sine.InOut,
          },
          {
            scaleX: 1,
            scaleY: 1,
            duration: 125,
            ease: Phaser.Math.Easing.Sine.InOut,
          },
        ],
      }));
    } else {
      chains.push(window.gdScene.tweens.chain({
        targets: layer.sprite,
        tweens: [
          {
            scaleX: 1.35,
            scaleY: 0.8,
            duration: 150,
            ease: Phaser.Math.Easing.Sine.InOut,
          },
          {
            scaleX: 0.9,
            scaleY: 1.1,
            duration: 125,
            ease: Phaser.Math.Easing.Sine.InOut,
          },
          {
            scaleX: 1,
            scaleY: 1,
            duration: 125,
            ease: Phaser.Math.Easing.Sine.InOut,
          },
        ],
      }));
    }
  }

  cancelVerticalJump = () => {
    chains.forEach((chain) => chain.stop());
    window.gdScene.tweens.add({
      targets: validLayers,
      scaleX: 1,
      scaleY: 1,
      duration: 125,
      ease: Phaser.Math.Easing.Sine.InOut,
    });
  };
};

// Easing Camera
api.onLoad(() => {
  let cameraX = window.gdScene._cameraX;
  const easeSpeed = 0.12;

  Object.defineProperty(window.gdScene, "_cameraX", {
    get: () => cameraX,
    set: (newCameraX) => {
      if (newCameraX != window.gdScene._playerWorldX - 419) {
        cameraX = newCameraX;
      } else if (cameraX !== newCameraX) {
        cameraX += (newCameraX - cameraX) * easeSpeed;
      }
    },
  });
});

// Fix ground land emitters
api.patchMethod("hitGround", (code) => {
  return code.replace(
    /\)\]\(0xa,_0x[\da-f]+,(_0x[\da-f]+)/,
    ")](10, window.gdScene._playerWorldX, $1",
  );
});
