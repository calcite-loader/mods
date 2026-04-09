/*
 * @name No Clip
 * @needsRefresh true
 */

// TODO: get working with onDeath, rn attempting to do so starts the death animation but it doesn't kill you but it still looks quite buggy, idk why

api.patchMethod("checkCollisions", (code) => {
  return code.replaceAll(
    /return\s+void\s+this\s*\[\s*_0x[\da-f]+\s*\(\s*0x[\da-f]+\s*\)\s*\]\s*\(\s*\)/g,
    "{}",
  );
});
