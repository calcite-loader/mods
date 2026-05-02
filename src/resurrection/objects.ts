import type { ObjectDefinition } from "@calcite-loader/types";

export const getObjects = async () => {
  const window = {} as { allobjects: () => ObjectDefinition[] };
  const response = await fetch(
    "https://raw.githubusercontent.com/web-dashers/web-dashers.github.io/refs/heads/main/assets/scripts/game/allObjects.js",
  );
  eval(await response.text());
  return window.allobjects();
};
