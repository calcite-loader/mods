/**
 * @name Physics Utils
 * @type library
 * @needsRefresh true
 */

declare global {
  interface Window {
    _physicsUtils: {
      setPlayerSpeed: (newSpeed: number) => void;
      getPlayerSpeed: () => number;
      setJumpVelocity: (newVelocity: number) => void;
      getJumpVelocity: () => number;
    };
  }
}
(window._physicsUtils as any) = {};

const defaultSpeed = 11.540004;
const defaultJumpVelocity = 1.916398;

api.patchScript(
  "index-game.js",
  (code) => {
    code = code.replace(
      new RegExp(`(\\w+)\\s*=\\s*${defaultSpeed}`),
      `; let $1 = ${defaultSpeed}; window._physicsUtils.setPlayerSpeed = (newSpeed) => { $1 = newSpeed }; window._physicsUtils.getPlayerSpeed = () => $1; const `,
    );

    code = code.replace(
      new RegExp(`(\\w+)\\s*=\\s*${defaultJumpVelocity}`),
      `; let $1 = ${defaultJumpVelocity}; window._physicsUtils.setJumpVelocity = (newSpeed) => { $1 = newSpeed }; window._physicsUtils.getJumpVelocity = () => $1; const `,
    );

    return code;
  },
);

export const setPlayerSpeed = (newSpeed: number) => {
  return window._physicsUtils.setPlayerSpeed(newSpeed);
};
export const getPlayerSpeed = () => window._physicsUtils.getPlayerSpeed();

export const setJumpVelocity = (newVelocity: number) => {
  return window._physicsUtils.setJumpVelocity(newVelocity);
};
export const getJumpVelocity = () => window._physicsUtils.getJumpVelocity();
