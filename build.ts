#!/usr/bin/env bun

import { Glob } from "bun";
import path from "node:path";

const extractHeader = async (filePath: string): Promise<string> => {
  const content = await Bun.file(filePath).text();
  const headerMatch = content.match(/^(\/\*[\s\S]*?\*\/)\s*\n/);
  return headerMatch && headerMatch[1] ? headerMatch[1] : "";
};

(async () => {
  const files = [...new Glob("*.ts").scanSync("src/")];

  for (const file of files) {
    const inputPath = path.join("src", file);
    const fileName = path.basename(file, ".ts");
    const outputPath = path.join("dist", `${fileName}.js`);

    const result = await Bun.build({
      entrypoints: [inputPath],
      outdir: "./dist",
      naming: "[name].[ext]",
    });

    if (!result.success) {
      console.error(`Build failed for ${file}:`, result.logs);
      continue;
    }

    const header = await extractHeader(inputPath);

    if (header) {
      const builtContent = await Bun.file(outputPath).text();
      await Bun.write(outputPath, header + "\n\n" + builtContent);
    }

    console.log("Built " + file);
  }

  console.log("Build Successful!");
})();
