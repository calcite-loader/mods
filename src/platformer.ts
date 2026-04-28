/*
 * @name Platformer Mode
 * @needsRefresh true
 * @deps physicsUtils
 */

declare global {
  interface Window {
    _platformer: {
      handleWallCollision: (object: any) => boolean;
      handleHitHead: (object: any) => void;
      playerDirection: 1 | -1 | 0;
    };
  }
}
(window._platformer as any) = {};

const defaultSpeed = 11.540004;

window._platformer.playerDirection = 0;

const physicsUtils = api.lib<typeof import("./physicsUtils")>("physicsUtils");

api.patchMethod("runRotateAction", (code) => {
  return code.replace(
    "Math['PI']",
    "Math['PI']*window._platformer.playerDirection",
  );
});

api.patchMethod("checkCollisions", (code) => {
  const objectVarName = code.match(/for\s*\(\s*let\s+(_0x[\da-f]+)/)?.[1];

  code = code.replace(
    /if\s*\(\s*_0x[\da-f]+\s*&&\s*!\s*(_0x[a-f\d]+)\s*\)\s*return\s+void\s+this\s*\[\s*_0x[\da-f]+\s*\(\s*0x[\da-f]+\s*\)\s*\]\s*\(\s*\)/,
    `if (!$1) { if (window._platformer.handleWallCollision(${objectVarName})) continue }`,
  );

  const index = code.indexOf("{", code.indexOf("&&this['p']")) + 1;
  code = code.slice(0, index) +
    `window._platformer.handleHitHead(${objectVarName});continue;` +
    code.slice(index);

  code = code.replace(
    "&&this['p']",
    "&&({isFlying:true})",
  );

  return code;
});

window._platformer.handleWallCollision = (object: any) => {
  const checkIsColliding = () => {
    const worldX = window.gdScene._playerWorldX;
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
    window.gdScene._playerWorldX -= window._platformer.playerDirection;
  }

  return true;
};

window._platformer.handleHitHead = (object: any) => {
  window.gdScene._state.y = (object.y - object.h / 2) - 30;

  if (window.gdScene._state.isFlying) {
    window.gdScene._player.hitGround();
    window.gdScene._state.onCeiling = true;
    window.gdScene._state.collideBottom = (object.y - object.h) / 2;
    return;
  }

  window.gdScene._state.yVelocity = 0;
};

api.onStart(() => {
  window.gdScene._playerWorldX = 0;
  physicsUtils.setPlayerSpeed(0);

  let playerWorldX = window.gdScene._playerWorldX;
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

    if (window._platformer.playerDirection != 0) {
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

        if (gamepad.buttons[14]?.pressed && gamepad.buttons[15]?.pressed) {
          window._platformer.playerDirection = 0;
        } else if (gamepad.buttons[14]?.pressed) {
          window._platformer.playerDirection = -1;
        } else if (gamepad.buttons[15]?.pressed) {
          window._platformer.playerDirection = 1;
        } else {
          window._platformer.playerDirection = 0;
        }

        physicsUtils.setPlayerSpeed(
          defaultSpeed * window._platformer.playerDirection,
        );

        if (
          window._platformer.playerDirection != oldDireciton &&
          window._platformer.playerDirection != 0
        ) window.gdScene._player.runRotateAction();
      }, "before");
    });
  }
});
