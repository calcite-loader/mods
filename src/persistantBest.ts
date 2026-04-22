/*
 * @name Persistant Best
 */

let currentBest = parseInt(window.localStorage.getItem("bestPercent") ?? "0");

api.onLoad(() => {
  Object.defineProperty(window.gdScene, "_bestPercent", {
    get: () => currentBest,
    set: (newBest) => {
      currentBest = newBest;
      window.localStorage.setItem("bestPercent", newBest);
    },
  });
});
