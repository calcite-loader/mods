/**
 * @name Physics Utils
 * @type library
 * @needsRefresh true
 * @compatibleHosts geometrydash.com, web-dashers.github.io
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
      new RegExp(`,\\s*(\\w+)\\s*=\\s*${defaultSpeed}\\s*,`),
      `; let $1 = ${defaultSpeed}; window._physicsUtils.setPlayerSpeed = (newSpeed) => { $1 = newSpeed }; window._physicsUtils.getPlayerSpeed = () => $1; const `,
    );

    code = code.replace(
      new RegExp(`,\\s*(\\w+)\\s*=\\s*${defaultJumpVelocity}\\s*,`),
      `; let $1 = ${defaultJumpVelocity}; window._physicsUtils.setJumpVelocity = (newVelocity) => { $1 = newVelocity }; window._physicsUtils.getJumpVelocity = () => $1; const `,
    );

    return code;
  },
);

// For Web Dashers
api.patchScript(
  "config.js",
  (code) => {
    code = code.replace(
      /(let\s+playerSpeed\s*=\s*SpeedPortal.ONE_TIMES;)/,
      `$1 window._physicsUtils.setPlayerSpeed = (newSpeed) => { playerSpeed = newSpeed }; window._physicsUtils.getPlayerSpeed = () => playerSpeed;`,
    );

    code = code.replace(
      new RegExp(`const\\s+(\\w+)\\s*=\\s*${defaultJumpVelocity}\\s*;`),
      `let $1 = ${defaultJumpVelocity}; window._physicsUtils.setJumpVelocity = (newVelocity) => { $1 = newVelocity }; window._physicsUtils.getJumpVelocity = () => $1;`,
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
