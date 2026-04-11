/*
 * @name Platformer Mode
 * @needsRefresh true
 */

declare global {
  interface Window {
    setPlayerSpeed: (newSpeed: number) => void;
    playerDirection: 1 | -1 | 0;
  }
}

const defaultSpeed = 11.540004;

window.playerDirection = 0;

api.patchScript(
  "index-game.js",
  (code) => {
    code = code.replace(
      new RegExp(`,\\s*(\\w+)\\s*=\\s*${defaultSpeed},\\s*`), // Def not ripped out of the physics mod
      `; let $1 = ${defaultSpeed}; window.setPlayerSpeed = (newSpeed) => { $1 = newSpeed }; const `,
    );

    return code;
  },
);

api.patchMethod("runRotateAction", (code) => {
  return code.replace("Math['PI']", "Math['PI']*window.playerDirection");
});

api.onStart(() => {
  window.setPlayerSpeed(0);

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
      window.playerDirection = 0;
    } else if (isLeftDown()) {
      window.playerDirection = -1;
    } else if (isRightDown()) {
      window.playerDirection = 1;
    } else {
      window.playerDirection = 0;
    }

    window.setPlayerSpeed(defaultSpeed * window.playerDirection);
  };

  [leftKey, rightKey, aKey, dKey].forEach((key) => {
    key.on("down", updateMovement);
    key.on("up", updateMovement);
  });

  wKey.on("down", () => window.gdScene._pushButton());
  wKey.on("up", () => window.gdScene._releaseButton());
});
