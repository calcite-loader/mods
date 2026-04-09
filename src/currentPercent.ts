/*
 * @name Current Percent
 */

const settings = api.registerSettings({
  decimals: {
    type: "toggle",
    name: "Show Decimals",
    default: false,
  },
});

api.onStart(() => {
  const percentText = window.gdScene.add.bitmapText(
    window.gdScene.cameras.main.width / 2,
    20,
    "bigFont",
    "0%",
    32,
  ).setOrigin(0.5, 0);

  window.gdScene.events.on("update", () => {
    percentText.setText(
      Math.max(
        Math.floor(
          window.gdScene._playerWorldX / window.gdScene._level.endXPos *
            (settings.decimals ? 1000 : 100),
        ) / (settings.decimals ? 10 : 1),
        0,
      ).toFixed(settings.decimals ? 1 : 0) + "%",
    );
  });
});
