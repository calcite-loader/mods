/*
 * @name Always Fly
 */

api.onLoad(() => {
  Object.defineProperty(window.gdScene._state, "isFlying", {
    get: () => true,
    set: () => {},
  });
});
