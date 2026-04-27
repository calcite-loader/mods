/*
 * @name Physics Mod
 * @needsRefresh true
 * @deps physicsUtils
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

const physicsUtils = api.lib<typeof import("./physicsUtils")>("physicsUtils");

api.onLoad(() => {
  physicsUtils.setPlayerSpeed(
    physicsUtils.getPlayerSpeed() * settings.speedMultiplier,
  );

  physicsUtils.setJumpVelocity(
    physicsUtils.getJumpVelocity() * settings.jumpMultiplier,
  );
});
