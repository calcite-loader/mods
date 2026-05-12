/*
 * @name Level Loader
 * @needsRefresh true
 * @deps worldUtils, serverUtils
 * @compatibleHosts geometrydash.com, web-dashers.github.io
 */

declare global {
  interface Window {
    _levelLoader: {
      parseLevel: (levelstring: string) => { objects: any[] };
    };
  }
}
(window._levelLoader as any) = {};

const worldUtils = api.lib<typeof import("./worldUtils")>("worldUtils");
const serverUtils = api.lib<typeof import("./serverUtils")>("serverUtils");

const settings = api.registerSettings({
  source: {
    type: "select",
    name: "Source",
    options: {
      levelstring: "Level String",
      levelId: "Level ID",
    },
    default: "levelId",
  },
  levelstring: {
    type: "string",
    name: "Level String",
    default: "",
    condition: (settings) => settings.source === "levelstring",
  },
  levelId: {
    type: "number",
    name: "Level ID",
    default: 0,
    condition: (settings) => settings.source === "levelId",
  },
});

worldUtils.disableLevel();

let parseLevelName: string;
api.patchMethod("loadLevel", (code) => {
  parseLevelName = code.match(/(\w+)\(_0x[\da-f]+\)/)?.[1]!;
  return code;
});

api.patchScript("index-game.js", (code) => {
  const originalFunction = api.extractFunction(
    code,
    parseLevelName,
  ) as string;
  return code.replace(
    originalFunction,
    originalFunction +
      `;window._levelLoader.parseLevel=${parseLevelName};`,
  );
});

api.onLoad(async () => {
  if (settings.source === "levelstring") {
    window.gdScene._level._spawnLevelObjects(
      window._levelLoader.parseLevel(settings.levelstring).objects,
    );
    return;
  }

  const levelInfo = await serverUtils.fetchLevel(settings.levelId);
  if (levelInfo == null) return;

  window.gdScene._level._spawnLevelObjects(
    window._levelLoader.parseLevel(levelInfo.levelstring).objects,
  );
});
