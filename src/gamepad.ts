/**
 * @name Gamepad
 */

let gamepad: Gamepad | null | undefined = navigator.getGamepads()[0];

const addGamepadListeners: (() => void)[] = [];

window.addEventListener("gamepadconnected", (e) => {
  gamepad = e.gamepad;
  addGamepadListeners.forEach((listener) => listener());
});

const updateGamepad = () => {
  gamepad = navigator.getGamepads()[gamepad!.index];
};

let wasDown = false;

const isJumpPressed = () => {
  if (!gamepad) return false;

  return gamepad.buttons[0]?.pressed || gamepad.buttons[12]?.pressed;
};

api.onUpdate(() => {
  if (!gamepad) return;
  updateGamepad();

  if (isJumpPressed() && !wasDown) {
    window.gdScene._pushButton();
    wasDown = true;
  }
  if (!isJumpPressed() && wasDown) {
    window.gdScene._releaseButton();
    wasDown = false;
  }
}, "before");

api.onMessage((_, cb: (gamepad: Gamepad) => void) => {
  if (gamepad != null) {
    cb(gamepad);
  } else {
    addGamepadListeners.push(() => cb(gamepad as Gamepad));
  }
});
