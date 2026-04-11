/*
 * @name Show Hitboxes
 * @needsRefresh true
 */

let hitboxGraphics: Phaser.GameObjects.Graphics;

api.onLoad(() => {
  hitboxGraphics = window.gdScene.add.graphics()
    .setScrollFactor(0)
    .setDepth(20);

  window.gdScene._player._showHitboxes = true;
});

api.onUpdate(() => {
  window.gdScene._player.drawHitboxes(
    hitboxGraphics,
    window.gdScene._cameraX,
    window.gdScene._cameraY,
  );
});

api.patchMethod("getNearbySectionObjects", (code) => {
  return code.replace(/(_0x[\da-f]+)\s*\+\s*0x1/, "$1 + 2");
});
