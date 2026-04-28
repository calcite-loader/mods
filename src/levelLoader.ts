/*
 * @name Level Loader
 * @needsRefresh true
 * @deps worldUtils
 */

const settings = api.registerSettings({
  levelstring: {
    type: "string",
    name: "Level String",
    default: "",
  },
});

const worldUtils = api.lib<typeof import("./worldUtils")>("worldUtils");
worldUtils.loadLevel(settings.levelstring);
