/*
 * @name Editor
 * @needsRefresh true
 */

/* Todo List:
 * Loading Exported Levels
 * Playtesting
 * Fix extra objects (portal backs and the pulsing thingies)
 */

const settings = api.registerSettings({
  invertRotation: {
    name: "Invert Rotation",
    type: "toggle",
    default: false,
  },
});

enum ObjectType {
  SOLID = "solid",
  HAZARD = "hazard",
  DECORATIVE = "deco",
  PORTAL = "portal",
  PAD = "pad",
  RING = "ring",
  TRIGGER = "trigger",
  SPEED = "speed",
  FLY = "fly",
  CUBE = "cube",
}

declare global {
  interface Window {
    _editor: {
      setPlayerSpeed: (newSpeed: number) => void;
      objectDefinitions: Record<number, {
        type: ObjectType;
        frame: string;
        gridW: number;
        gridH: number;
      }>;
    };
  }
}
(window._editor as any) = {};

const defaultSpeed = 11.540004;

// Def not ripped out of the platformer mode mod
api.patchScript(
  "index-game.js",
  (code) => {
    code = code.replace(
      new RegExp(`,\\s*(\\w+)\\s*=\\s*${defaultSpeed},\\s*`),
      `; let $1 = ${defaultSpeed}; window._editor.setPlayerSpeed = (newSpeed) => { $1 = newSpeed }; const `,
    );

    return code;
  },
);

// Movement Logic

let playerY = 30;
let playerVelY = 0;

api.onStart(() => {
  window._editor.setPlayerSpeed(0);

  Object.defineProperty(window.gdScene._state, "y", {
    get: () => {
      return playerY;
    },
    set: () => {},
  });

  Object.defineProperty(window.gdScene._player, "_rotation", {
    get: () => 0,
    set: () => {},
  });
  window.gdScene._player.checkCollisions = () => {};

  const leftKey = window.gdScene.input.keyboard!.addKey(
    Phaser.Input.Keyboard.KeyCodes.LEFT,
  );
  const rightKey = window.gdScene.input.keyboard!.addKey(
    Phaser.Input.Keyboard.KeyCodes.RIGHT,
  );
  const upKey = window.gdScene.input.keyboard!.addKey(
    Phaser.Input.Keyboard.KeyCodes.UP,
  );
  const downKey = window.gdScene.input.keyboard!.addKey(
    Phaser.Input.Keyboard.KeyCodes.DOWN,
  );
  const aKey = window.gdScene.input.keyboard!.addKey(
    Phaser.Input.Keyboard.KeyCodes.A,
  );
  const dKey = window.gdScene.input.keyboard!.addKey(
    Phaser.Input.Keyboard.KeyCodes.D,
  );
  const wKey = window.gdScene.input.keyboard!.addKey(
    Phaser.Input.Keyboard.KeyCodes.W,
  );
  const sKey = window.gdScene.input.keyboard!.addKey(
    Phaser.Input.Keyboard.KeyCodes.S,
  );

  const isLeftDown = () => leftKey.isDown || aKey.isDown;
  const isRightDown = () => rightKey.isDown || dKey.isDown;
  const isUpDown = () => upKey.isDown || wKey.isDown;
  const isDownDown = () => downKey.isDown || sKey.isDown;

  const updateMovement = () => {
    window._editor.setPlayerSpeed(
      defaultSpeed * (+isRightDown() - +isLeftDown()),
    );
    playerVelY = defaultSpeed * (+isUpDown() - +isDownDown());
  };

  [leftKey, rightKey, upKey, downKey, aKey, dKey, wKey, sKey].forEach((key) => {
    key.on("down", updateMovement);
    key.on("up", updateMovement);
  });
});

api.onUpdate(() => {
  playerY += playerVelY;
});

// Make object definitions globally available via window._editor.objectDefinitions
api.patchScript("index-game.js", (code) => {
  const match = code.match(
    /,\s*(\w+)\s*=\s*{\s*0x1:\s*{\s*'type'\s*:\s*\w+\s*,\s*'frame'/,
  );
  if (!match || !match[1]) return code;
  const index = code.indexOf(";", match.index) + 1;
  return code.slice(0, index) +
    `window._editor.objectDefinitions = ${match[1]};` +
    code.slice(index);
});

const objectCycles: Record<
  number,
  (keyof typeof window._editor.objectDefinitions)[]
> = {
  1: [1, 2, 3, 4, 5, 6, 7, 40, 83, 195, 196],
  2: [8, 9, 39, 61, 103, 392],
  3: [12, 13],
  4: [15, 16, 17],
  5: [18, 19, 20, 21, 41, 50],
} as const;
let cycleIndex = 0;
let currentCycle: keyof typeof objectCycles = 1;

let eraser = false;

let rotation = 0;

api.patchMethod("loadLevel", (code) => {
  return code.replace("{", "{return;");
});

const groundBoundsY = 460;

const gridSize = 60;
let grid = true;

const snapToGrid = (pos: number, isY: boolean = false) => {
  return grid
    ? Math.round((pos - (isY ? groundBoundsY : 0) - gridSize / 2) / gridSize) *
        gridSize + (isY ? groundBoundsY : 0) + gridSize / 2
    : pos;
};

// Toggle Grid
api.onStart(() => {
  const gKey = window.gdScene.input.keyboard!.addKey(
    Phaser.Input.Keyboard.KeyCodes.G,
  );

  gKey.on("down", () => grid = !grid);
});

// Preview
let previewImage: Phaser.GameObjects.Image;

api.onStart(() => {
  previewImage = window.createImageFromAtlas(
    window.gdScene,
    0,
    0,
    window._editor.objectDefinitions[objectCycles[currentCycle]?.[cycleIndex]!]
      ?.frame!,
  );
  previewImage.alpha = 0.25;

  api.onUpdate(() => {
    const pointer = window.gdScene.input.mousePointer;
    const worldX = snapToGrid(pointer.x + window.gdScene._cameraX);
    const worldY = snapToGrid(pointer.y - window.gdScene._cameraY, true);

    previewImage.x = worldX - window.gdScene._cameraX;
    previewImage.y = worldY + window.gdScene._cameraY;
  });
});

const updatePreview = () => {
  previewImage.setFrame(
    window._editor.objectDefinitions[objectCycles[currentCycle]?.[cycleIndex]!]
      ?.frame!,
  );
};

// Placing

interface PlacedObject {
  id: number;
  x: number;
  y: number;
  rotation: number; /** In degrees */
}

const placedObjects: PlacedObject[] = [];

const addObject = () => {
  const definition = window
    ._editor.objectDefinitions[objectCycles[currentCycle]?.[cycleIndex]!]!;
  const isPortal = (definition.type === ObjectType.PORTAL ||
    definition.type === ObjectType.SPEED) &&
    definition.frame.includes("_front_");
  const flaggedDefinition = isPortal
    ? {
      ...definition,
      _portalFront: true,
    }
    : definition;

  const pointer = window.gdScene.input.mousePointer;

  const worldX = snapToGrid(pointer.x + window.gdScene._cameraX);
  const worldY = snapToGrid(pointer.y - window.gdScene._cameraY, true);

  placedObjects.push({
    id: objectCycles[currentCycle]?.[cycleIndex]!,
    x: worldX / 2,
    y: (groundBoundsY - worldY) / 2,
    rotation,
  });

  const sprite = window.createImageFromAtlas(
    window.gdScene,
    worldX,
    worldY,
    definition.frame,
  ) as Phaser.GameObjects.Image & {
    _eeWorldX: number;
    _eeBaseY: number;
    placedObjectIndex: number;
  };
  window.gdScene._level._applyVisualProps(
    window.gdScene,
    sprite,
    definition.frame,
    {
      "id": objectCycles[currentCycle]?.[cycleIndex],
      "x": worldX / 2,
      "y": (groundBoundsY - worldY) / 2,
      "flipX": false,
      "flipY": false,
      "rot": rotation,
      "scale": 1,
      "zLayer": 0,
      "zOrder": 0,
      "groups": "",
      "color1": 0,
      "color2": 0,
    },
    definition,
  );
  window.gdScene._level._addVisualSprite(sprite, flaggedDefinition);
  sprite._eeWorldX = worldX;
  sprite._eeBaseY = worldY;
  window.gdScene._level._addToSection(sprite);

  sprite.placedObjectIndex = placedObjects.length - 1;

  sprite.setInteractive({ useHandCursor: false });
  sprite.on("pointerdown", () => {
    if (!eraser) return;
    const sectionIndex = Math.max(0, Math.floor(sprite._eeWorldX / 400));
    window.gdScene._level._sections[sectionIndex]?.splice(
      window.gdScene._level._sections[sectionIndex].indexOf(sprite),
    );
    placedObjects.splice(sprite.placedObjectIndex, 1);
    sprite.destroy();
  });
};

api.onStart(() => {
  Object.defineProperty(window.gdScene._level, "endXPos", {
    get: () => Number.MAX_SAFE_INTEGER,
    set: () => {},
  });

  window.gdScene.input.keyboard?.on("keydown", (e: { key: string }) => {
    if (e.key === "0") {
      eraser = true;
      cycleIndex = -1;
      previewImage.visible = false;
    }
    if (!(Number(e.key) in objectCycles)) return;
    eraser = false;
    previewImage.visible = true;
    if (currentCycle == Number(e.key)) {
      cycleIndex++;
      if (cycleIndex == objectCycles[currentCycle]?.length) cycleIndex = 0;
      updatePreview();
      return;
    }
    currentCycle = Number(e.key);
    cycleIndex = 0;
    updatePreview();
  });

  window.gdScene.input.on("pointerdown", () => {
    if (window.gdScene._paused || eraser) return;
    addObject();
  });
});

// Rotation
api.onStart(() => {
  const qKey = window.gdScene.input.keyboard!.addKey(
    Phaser.Input.Keyboard.KeyCodes.Q,
  );
  const eKey = window.gdScene.input.keyboard!.addKey(
    Phaser.Input.Keyboard.KeyCodes.E,
  );

  qKey.on("down", () => {
    rotation += 90 * (settings.invertRotation ? -1 : 1);
    previewImage.angle = rotation;
  });

  eKey.on("down", () => {
    rotation -= 90 * (settings.invertRotation ? -1 : 1);
    previewImage.angle = rotation;
  });
});

// Fix Start thing
api.onStart(() => {
  window.gdScene._playerWorldX = 0;
});

// Exporting

const createObjectString = () => {
  const exportedObjects: string[] = [];
  for (const object of placedObjects) {
    exportedObjects.push(
      `1,${object.id},2,${object.x},3,${object.y},6,${object.rotation}`,
    );
  }

  return exportedObjects.join(";");
};

const header =
  "kS38,1_0_2_255_3_0_4_-1_6_1000_7_1_8_1,kS39,0,kA13,0,kA2,0,kA3,0,kA4,0;";

const createLevelString = () => {
  const raw = header + createObjectString() + ";";

  const compressed = window.pako.deflate(raw);

  const binString = String.fromCharCode(...compressed);
  const base64 = btoa(binString)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return base64;
};

// Exporting UI
api.onStart(() => {
  const exportBtn = document.createElement("button");
  exportBtn.textContent = "Export";

  exportBtn.style.position = "absolute";
  exportBtn.style.right = "2rem";
  exportBtn.style.bottom = "2rem";

  exportBtn.addEventListener("click", () => {
    alert(createLevelString());
  });

  document.body.appendChild(exportBtn);
});
