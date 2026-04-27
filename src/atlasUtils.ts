/**
 * @name Atlas Utils
 * @type library
 * @needsRefresh true
 */

declare global {
  interface Window {
    _atlasUtils: {
      createImageFromAtlas: (
        scene: Phaser.Scene,
        x: number,
        y: number,
        frame: string,
      ) => Phaser.GameObjects.Image;
    };
  }
}
(window._atlasUtils as any) = {};

let createImageFromAtlasName: string;

api.patchMethod("_addGlowSprite", (code) => {
  createImageFromAtlasName = code.match(/let\s+_0x[\da-f]+\s*=\s*(\w+)\s*\(/)
    ?.[1]!;
  return code;
});

api.patchScript("index-game.js", (code) => {
  const originalFunction = api.extractFunction(
    code,
    createImageFromAtlasName,
  ) as string;
  return code.replace(
    originalFunction,
    originalFunction +
      `;window._atlasUtils.createImageFromAtlas=${createImageFromAtlasName};`,
  );
});

let cachedAtlasFunction: typeof window._atlasUtils.createImageFromAtlas | null =
  null;
export const createImageFromAtlas:
  typeof window._atlasUtils.createImageFromAtlas = (scene, x, y, frame) => {
    if (!cachedAtlasFunction) {
      cachedAtlasFunction = window._atlasUtils.createImageFromAtlas;
    }
    return cachedAtlasFunction(scene, x, y, frame);
  };

interface CustomAtlas {
  key: string;
  png: string;
  json: string;
}

const customAtlases: CustomAtlas[] = [];

export const addCustomObjectAtlas = (
  key: string,
  png: string,
  json: string,
) => {
  customAtlases.push({ key, png, json });
};

api.patchMethod("preload", (code) => {
  return code.slice(0, -1) +
    `; ${
      customAtlases.map((atlas) =>
        `this.load.atlas("${atlas.key}", "${atlas.png}", "${atlas.json}")`
      ).join(";")
    } }`;
});

api.patchScript("index-game.js", (code) => {
  code = code.replace(
    new RegExp(
      `const\\s+(\\w+)\\s*=\\s*\\[\\s*_0x[a-f\\d]+\\s*\\(\\s*0x${
        api.getObfuscatedId("GJ_WebSheet").toString(16)
      }\\s*\\)\\s*\\]`,
    ),
    `const $1 = ['GJ_WebSheet', ${
      customAtlases.map((atlas) => `'${atlas.key}'`).join(", ")
    }]`,
  );
  return code;
});
