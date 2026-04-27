/**
 * @name Gamepad
 * @conflicts platformer
 */

let gamepad: Gamepad | null | undefined = navigator.getGamepads()[0];

window.addEventListener("gamepadconnected", (e) => {
  gamepad = e.gamepad;
});

const updateGamepad = () => {
  gamepad = navigator.getGamepads()[gamepad!.index];
};

let wasDown = false;

api.onUpdate(() => {
  if (!gamepad) return;
  updateGamepad();

  if (gamepad.buttons[0]?.pressed && !wasDown) {
    window.gdScene._pushButton();
    wasDown = true;
  }
  if (!gamepad.buttons[0]?.pressed && wasDown) {
    window.gdScene._releaseButton();
    wasDown = false;
  }
}, "before");
