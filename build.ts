#!/usr/bin/env bun

import { Glob } from "bun";
import path from "node:path";

const extractHeader = async (filePath: string): Promise<string> => {
  const content = await Bun.file(filePath).text();
  const headerMatch = content.match(/^(\/\*[\s\S]*?\*\/)\s*\n/);
  return headerMatch && headerMatch[1] ? headerMatch[1] : "";
};

const isCI = Bun.argv.includes("--ci");
const manifest = {
  mods: [] as { id: string; name: string; downloadUrl: string }[],
};

(async () => {
  const files = [...new Glob("*.ts").scanSync("src/")];

  for (const file of files) {
    const id = path.parse(file).name;
    const inputPath = path.join("src", file);
    const outputPath = path.join("dist", `${id}.js`);

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

      const nameMatch = header.match(/@name\s+(.*)/);
      if (isCI) {
        manifest.mods.push({
          id,
          name: nameMatch ? nameMatch[1]!.trim() : id,
          downloadUrl:
            `https://${process.env.GITHUB_REPOSITORY_OWNER}.github.io/${process.env.GITHUB_REPOSITORY_NAME}/${id}.js`,
        });
      }

      console.log(
        "Built: " + (nameMatch ? nameMatch[1]?.trim() : id),
      );
    } else {
      console.log("Built: " + id);
    }
  }

  if (isCI) {
    await Bun.write("dist/manifest.json", JSON.stringify(manifest));
    console.log("Generated Manifest!");
  }

  console.log("Build Successful!");
})();
