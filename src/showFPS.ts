/*
 * @name Show FPS
 */

api.onLoad(() => {
  window.gdScene._fpsText.visible = true;

  window.gdScene._fpsText.y += 50; // Overlapping "i" icon by default.
  window.gdScene._fpsText.x += 5; // Right align

  // General Style Improvements
  window.gdScene._fpsText.setStyle({ fontStyle: "bold" });
  window.gdScene._fpsText.setColor("white");
});
