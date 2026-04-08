/*
 * @name No Clip
 * @needsRefresh true
 */

api.patchMethod("checkCollisions", (code) => {
  return code.replaceAll(
    /return\s+void\s+this\s*\[\s*_0x[\da-f]+\s*\(\s*0x[\da-f]+\s*\)\s*\]\s*\(\s*\)/g,
    "{}",
  );
});
