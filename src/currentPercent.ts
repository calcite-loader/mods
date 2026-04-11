/*
 * @name Current Percent
 */

const settings = api.registerSettings({
  decimals: {
    type: "number",
    name: "Decimal Places",
    default: 0,
  },
});

let percentText: Phaser.GameObjects.BitmapText;

api.onStart(() => {
  percentText = window.gdScene.add.bitmapText(
    window.gdScene.cameras.main.width / 2,
    20,
    "bigFont",
    "0%",
    32,
  ).setOrigin(0.5, 0);
});

api.onUpdate(() => {
  const places = Math.max(0, settings.decimals);
  const multiplier = Math.pow(10, places);

  const progress =
    (window.gdScene._playerWorldX / window.gdScene._level.endXPos) * 100;

  const formattedPercent = (Math.max(
    Math.floor(progress * multiplier) / multiplier,
    0,
  )).toFixed(places);

  percentText.setText(formattedPercent + "%");
});
