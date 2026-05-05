/**
 * @name World Utils
 * @type library
 * @needsRefresh true
 * @compatibleHosts geometrydash.com, web-dashers.github.io
 */

import type {
  GameObject as GameObjectType,
  ObjectDefinition,
  ObjectType,
} from "@calcite-loader/types";

type GameObjectClass = {
  new (
    type: string,
    x: number,
    y: number,
    w: number,
    h: number,
  ): GameObjectType;
};

declare global {
  interface Window {
    _worldUtils: {
      objectDefinitions: Record<number, ObjectDefinition>;

      runAddColliderCallback: (
        index: number,
        definition: ObjectDefinition,
        levelObject: any, // TODO: type
        x: number,
        y: number,
      ) => void;
      runConditionCallback: (index: number, type: string) => boolean;
      runHandleCollisionCallback: (
        index: number,
        object: GameObjectType,
      ) => boolean;

      GameObject: GameObjectClass;
    };
  }
}
(window._worldUtils as any) = {};

// Level Stuff

export const loadLevel = (levelstring: string) => {
  api.patchMethod("loadLevel", (code) => {
    const argName = code.match(/\((_0x[\da-f]+)\)/)?.[1] ?? "levelData";

    return code.replace("{", `{var ${argName} = "${levelstring}";`);
  });
};

export let levelDisabled = false;

export const disableLevel = () => {
  levelDisabled = true;
  api.patchMethod("loadLevel", (code) => code.replace("{", "{return;"));
};

export const enableLevel = () => {
  if (!levelDisabled) return;
  api.patchMethod("loadLevel", (code) => code.replace("{return;", "{"));
};

// Object Definitions

api.patchScript("index-game.js", (code) => {
  const objectDefinitionRegex =
    /,\s*(\w+)\s*=\s*({\s*0x1:\s*{\s*'type'\s*:\s*\w+\s*,\s*'frame')/;
  const match = code.match(objectDefinitionRegex);

  code = code.replace(objectDefinitionRegex, "; let $1 = $2");

  if (!match || !match[1]) return code;
  const index = code.indexOf(";", match.index! + 2) + 1;
  return code.slice(0, index) +
    `window._worldUtils.objectDefinitions = ${match[1]}; ${
      match[1]
    } = window._worldUtils.objectDefinitions;` +
    code.slice(index);
});

type ObjectDefinitionModifier = (
  objectDefinitions: Record<number, ObjectDefinition>,
) => Record<number, ObjectDefinition>;

let modifiers: ObjectDefinitionModifier[] = [];

export const modifyObjectDefinitions = (cb: ObjectDefinitionModifier) => {
  modifiers.push(cb);
};

export let objectDefinitions: Record<number, ObjectDefinition>;
Object.defineProperty(window._worldUtils, "objectDefinitions", {
  get: () => objectDefinitions,
  set: (originalDefinitions) => {
    const first = objectDefinitions == null;
    objectDefinitions = originalDefinitions;
    if (!first) return;
    for (const modifier of modifiers) {
      objectDefinitions = modifier(objectDefinitions);
    }
  },
});

// Object/Hitbox Additions

export type AddColliderCallback = (
  definition: ObjectDefinition,
  levelObject: any,
  x: number,
  y: number,
) => void;
export type ConditionCallback = (type: string) => boolean;
/**
 * @return Whether or not the rest of the collision checks should be skipped.
 */
export type HandleCollisionCallback = (object: GameObjectType) => boolean;

const newColliderTypes: {
  objectType: ObjectType;
  condition: string | ConditionCallback;
  addCollider: AddColliderCallback;
  handleCollision: HandleCollisionCallback;
}[] = [];
export const registerNewColliderType = (
  objectType: ObjectType,
  condition: string | ConditionCallback,
  addCollider: AddColliderCallback,
  handleCollision: HandleCollisionCallback,
) => {
  newColliderTypes.push({
    objectType,
    condition,
    addCollider,
    handleCollision,
  });
};

window._worldUtils.runAddColliderCallback = (
  index,
  definition,
  levelObject,
  x,
  y,
) => {
  newColliderTypes[index]?.addCollider(definition, levelObject, x, y);
};
window._worldUtils.runConditionCallback = (index, type) => {
  const condition = newColliderTypes[index]!.condition;

  if (typeof condition == "string") return type == condition;
  return condition(type);
};
window._worldUtils.runHandleCollisionCallback = (index, object) => {
  return newColliderTypes[index]!.handleCollision(object);
};

let gameObjectClassName: string;

api.patchMethod("_spawnLevelObjects", (code) => {
  const gameObjectRegex = /new\s+(?!Set\s*\()(\w+)/;
  gameObjectClassName = code.match(gameObjectRegex)?.[1]!;

  const index = code.indexOf("}", code.search(gameObjectRegex)) + 1;
  const definitionVarName = code.match(
    /for\s*\(\s*let\s+_0x[\da-f]+\s+of\s+_0x[\da-f]+\s*\)\s*\{\s*let\s+(_0x[\da-f]+)/,
  )?.[1]!;

  const xName = code.match(/let\s+(_0x[\da-f]+)\s*=\s*(?:0x)?2\s*\*/)?.[1]!;
  const yName = code.match(/,\s*(_0x[\da-f]+)\s*=\s*(?:0x)?2\s*\*/)?.[1]!;
  const levelObjName = code.match(/for\s*\(let\s+(_0x[\da-f]+)/)?.[1]!;

  code = `${code.slice(0, index)} ${
    newColliderTypes.map((colliderData, index) =>
      `else if (${definitionVarName}.type === "${colliderData.objectType}") { window._worldUtils.runAddColliderCallback(${index}, ${definitionVarName}, ${levelObjName}, ${xName}, ${yName}) }`
    ).join("")
  } ${code.slice(index)}`;

  return code;
});

api.patchMethod("checkCollisions", (code) => {
  return code.replace(
    /(if\s*\(\s*(_0x[\da-f]+)\s*\[\s*_0x[\da-f]+\s*\(\s*0x[\da-f]+\s*\)\s*\]\s*===\s*\w+\s*\)\s*return\s+void\s+this\s*\[\s*_0x[\da-f]+\s*\(\s*0x[\da-f]+\s*\)\s*\]\s*\(\s*\)\s*;)/,
    `$1 ${
      newColliderTypes.map((_, index) =>
        `if (window._worldUtils.runConditionCallback(${index}, $2.type)) { if (window._worldUtils.runHandleCollisionCallback(${index}, $2)) return; }`
      ).join(";")
    }`,
  );
});

api.patchScript("index-game.js", (code) => {
  const baseIndex = code.indexOf(`class ${gameObjectClassName}`);
  const endIndex = code.indexOf("}}", baseIndex) + 2;
  return code.slice(0, endIndex) +
    `;window._worldUtils.GameObject = ${gameObjectClassName};` +
    code.slice(endIndex);
});

export let GameObject: GameObjectClass;
Object.defineProperty(window._worldUtils, "GameObject", {
  get: () => GameObject,
  set: (newClass) => GameObject = newClass,
});
