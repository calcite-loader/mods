/*
 * @name Accurate Hitboxes
 * @needsRefresh true
 * @deps worldUtils
 */

import type { ObjectDefinition, ObjectType } from "@calcite-loader/types";

const worldUtils = api.lib<typeof import("./worldUtils")>("worldUtils");

declare global {
  interface Window {
    _accurateHitboxes: {
      createHazardHitbox: (
        definition: ObjectDefinition & { type: ObjectType.HAZARD },
        object: {
          x: number;
          y: number;
          flipX: boolean;
          flipY: boolean;
          rot: number;
        },
        x: number,
        y: number,
      ) => void;
    };
  }
}
(window._accurateHitboxes as any) = {};

api.patchMethod("_spawnLevelObjects", (code) => {
  const xName = code.match(/let\s+(_0x[\da-f]+)\s*=\s*(?:0x)?2\s*\*/)?.[1]!;
  const yName = code.match(/,\s*(_0x[\da-f]+)\s*=\s*(?:0x)?2\s*\*/)?.[1]!;

  const objectName = code.match(
    /let\s+_0x[\da-f]+\s*=\s*(?:0x)?2\s*\*\s*(_0x[\da-f]+)/,
  )?.[1]!;

  return code.replace(
    /(\((_0x[\da-f]+)\['type'\]===\w+\))/,
    `$1 { window._accurateHitboxes.createHazardHitbox($2, ${objectName}, ${xName}, ${yName}) } else if (false)`,
  );
});

window._accurateHitboxes.createHazardHitbox = (definition, object, x, y) => {
  const hitbox = new worldUtils.GameObject(
    "hazard_" + definition.frame,
    x,
    y,
    object.rot,
    +object.flipY, // flipX makes no difference so we don't encode it
  );
  window.gdScene._level.objects.push(hitbox);
  window.gdScene._level._addCollisionToSection(hitbox);
};

interface Vector2 {
  x: number;
  y: number;
}

const getNormals = (vertices: Vector2[]) => {
  const normals = [];
  for (let i = 0; i < vertices.length; i++) {
    const p1 = vertices[i];
    const p2 = vertices[(i + 1) % vertices.length];
    const edge = { x: p2!.x - p1!.x, y: p2!.y - p1!.y };
    normals.push({ x: -edge.y, y: edge.x });
  }
  return normals;
};

const project = (vertices: Vector2[], axis: Vector2) => {
  let min = Infinity;
  let max = -Infinity;
  for (const v of vertices) {
    const dot = v.x * axis.x + v.y * axis.y;
    if (dot < min) min = dot;
    if (dot > max) max = dot;
  }
  return { min, max };
};

const checkSAT = (a: Vector2[], b: Vector2[]) => {
  const axes = [...getNormals(a), ...getNormals(b)];
  for (const axis of axes) {
    const projA = project(a, axis);
    const projB = project(b, axis);
    if (projA.max < projB.min || projB.max < projA.min) return false;
  }
  return true;
};

const rotatePoint = (point: Vector2, deg: number): Vector2 => {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  };
};

api.onUpdate(() => {
  const px = window.gdScene._playerWorldX;
  const py = window.gdScene._state.y;

  let playerPoly = [
    { x: -30, y: -30 },
    { x: 30, y: -30 },
    { x: 30, y: 30 },
    { x: -30, y: 30 },
  ];

  playerPoly = playerPoly.map((point) => {
    // Fix edge collisions
    point.x += point.x < 0 ? 0.1 : -0.1;
    point.y += point.y < 0 ? 0.1 : -0.1;

    point.x += px;
    point.y += py;

    return point;
  });

  const nearbyObjects = window.gdScene._level.getNearbySectionObjects(px);
  for (const object of nearbyObjects) {
    if (!object.type.startsWith("hazard_")) continue;

    const ox = object.x;
    const oy = object.y;
    let hazardPoly: Vector2[] = [];

    switch (object.type) {
      case "hazard_spike_01_001.png":
        hazardPoly = [
          { x: -30, y: -30 },
          { x: 30, y: -30 },
          { x: 0, y: 30 },
        ];
        break;
      case "hazard_spike_02_001.png":
        hazardPoly = [
          { x: -30, y: -15 },
          { x: 30, y: -15 },
          { x: 0, y: 15 },
        ];
        break;
      case "hazard_pit_01_001.png":
        // Just a rectangle cause i'm lazy and it's close enough
        hazardPoly = [
          { x: -15, y: -13.5 },
          { x: 15, y: -13.5 },
          { x: 15, y: 13.5 },
          { x: -15, y: 13.5 },
        ];
        break;
    }

    hazardPoly = hazardPoly.map((point) => {
      if (!!object.h) point.y = -point.y; // Check for encoded flipY

      point = rotatePoint(point, object.w); // Rotation encoded in width

      point.x += ox;
      point.y += oy;

      return point;
    });

    if (hazardPoly.length > 0 && checkSAT(playerPoly, hazardPoly)) {
      window.gdScene._player.killPlayer();
      break;
    }
  }
});
