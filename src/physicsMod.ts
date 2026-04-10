/*
 * @name Physics Mod
 * @needsRefresh true
 */

const settings = api.registerSettings({
  speedMultiplier: {
    name: "Speed Multiplier",
    type: "slider",
    min: 0.1,
    max: 10,
    step: 0.1,
    default: 2,
  },
  jumpMultiplier: {
    name: "Jump Multiplier",
    type: "slider",
    min: 0.1,
    max: 10,
    step: 0.1,
    default: 2,
  },
});

const defaultSpeed = 11.540004;
const defaultJumpVelocity = 1.916398;

api.patchScript(
  "index-game.js",
  (code) => {
    code = code.replace(
      new RegExp(`(\\w+)\\s*=\\s*${defaultSpeed}`),
      `$1 = ${defaultSpeed * settings.speedMultiplier}`,
    );

    code = code.replace(
      new RegExp(`(\\w+)\\s*=\\s*${defaultJumpVelocity}`),
      `$1 = ${defaultJumpVelocity * settings.jumpMultiplier}`,
    );

    return code;
  },
);
