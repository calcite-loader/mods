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

const officialSongMap = {
  1: "BackOnTrack",
  2: "Polargeist",
  3: "DryOut",
  4: "BaseAfterBase",
  5: "CantLetGo",
  6: "Jumper",
  7: "TimeMachine",
  8: "Cycles",
  9: "xStep",
  10: "Clutterfunk",
  11: "TheoryOfEverything",
  12: "ElectromanAdventures",
  13: "Clubstep",
  14: "Electrodynamix",
  15: "HexagonForce",
  16: "BlastProcessing",
  17: "TheoryOfEverything2",
  18: "GeometricalDominator",
  19: "Deadlocked",
  20: "Fingerdash",
  21: "Dash",
} as const;

let levelName = "Unknown Level";
api.onLoad(async () => {
  if (settings.source === "levelstring") {
    window.gdScene._level._spawnLevelObjects(
      window._levelLoader.parseLevel(settings.levelstring).objects,
    );
    return;
  }

  const levelInfo = await serverUtils.fetchLevel(settings.levelId);
  if (levelInfo == null) return;

  if (levelInfo.officialSong && levelInfo.officialSong in officialSongMap) {
    window.gdScene._audio.reset();

    const songLoader = window.gdScene.load.audio("custom_song", [
      `https://web-dashers.github.io/assets/music/${
        officialSongMap[levelInfo.officialSong as keyof typeof officialSongMap]
      }.mp3`,
    ]);
    songLoader.on("filecomplete", () => {
      const audio = window.gdScene._audio;

      audio.startMusic = () => {
        if (audio._music) {
          audio._music.stop();
          audio._music.destroy();
        }

        audio._music = window.gdScene.sound.add("custom_song", {
          loop: true,
          volume: audio._effectiveVolume(),
        });

        audio._music.play();
        audio._setupAnalyser();
      };
    });
    songLoader.start();
  }

  levelName = levelInfo.name;

  window.gdScene._level._spawnLevelObjects(
    window._levelLoader.parseLevel(levelInfo.levelstring).objects,
  );
});

api.onPause(() => {
  for (const child of window.gdScene._pauseContainer?.list || []) {
    if (
      child.type === "BitmapText" &&
      (child as Phaser.GameObjects.BitmapText).text === "Stereo Madness"
    ) {
      (child as Phaser.GameObjects.BitmapText).text = levelName;
    }
  }
}, "after");
