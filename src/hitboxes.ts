/*
 * @name Show Hitboxes
 * @needsRefresh true
 */

api.onLoad(() => {
  (window as any).hitboxGraphics = window.gdScene.add.graphics()
    .setScrollFactor(0)
    .setDepth(20);

  window.gdScene._player._showHitboxes = true;

  // I honestly, need an onUpdate hook, as this lags 1 frame behind.
  /* window.gdScene.events.on("update", () => {
    window.gdScene._player.drawHitboxes(hitboxGraphics, window.gdScene._cameraX, window.gdScene._cameraY);
  }); */
});

api.patchMethod("syncSprites", (code) => {
  return code.slice(0, -1) +
    ";this.drawHitboxes(window.hitboxGraphics, window.gdScene._cameraX, window.gdScene._cameraY)}";
});

api.patchMethod("getNearbySectionObjects", (code) => {
  return code.replace(/(_0x[\da-f]+)\s*\+\s*0x1/, "$1 + 2");
});
