/*
 * @name Always Fly
 * @compatibleHosts geometrydash.com, web-dashers.github.io
 */

api.onLoad(() => {
  Object.defineProperty(window.gdScene._state, "isFlying", {
    get: () => true,
    set: () => {},
  });
});
