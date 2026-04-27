#!/usr/bin/env bun

import { Glob } from "bun";
import path from "node:path";

const parseHeaderFields = (code: string): Record<string, string> => {
  const fields: Record<string, string> = {};

  const headerCommentMatch = code.match(/^\/\*[\s\S]*?\*\//);
  if (!headerCommentMatch) return fields;

  const headerComment = headerCommentMatch[0];
  const fieldRegex = /@(\w+)\s+(.+?)(?=\n|$)/g;

  let match;
  while ((match = fieldRegex.exec(headerComment)) !== null) {
    fields[match[1]!] = match[2]!.trim();
  }

  return fields;
};

interface Dependency {
  id: string;
  downloadUrl?: string;
}

const parseDeps = (text: string): Dependency[] => {
  return text.split(",").map((dep) => dep.trim()).map((dep) =>
    dep.includes(";")
      ? {
        id: dep.split(";", 1)[0]!.trim(),
        downloadUrl: dep.split(";", 1)[1]!.trim(),
      }
      : { id: dep }
  );
};

const isCI = Bun.argv.includes("--ci");

let isDebug = !isCI;
if (Bun.argv.includes("--release")) isDebug = false;
if (Bun.argv.includes("--debug")) isDebug = true;

const manifest = {
  mods: [] as { id: string; name: string; downloadUrl: string }[],
};

(async () => {
  const files = [...new Glob("*.ts").scanSync("src/")];

  for (const file of files) {
    if (file.endsWith(".d.ts")) continue;

    const id = path.parse(file).name;
    const inputPath = path.join("src", file);
    const outputPath = path.join("dist", `${id}.js`);

    const result = await Bun.build({
      entrypoints: [inputPath],
      outdir: "./dist",
      naming: "[name].[ext]",
      minify: !isDebug,
      define: {
        BUILD_MODE: isDebug ? "'debug'" : "'release'",
      },
    });

    if (!result.success) {
      console.error(`Build failed for ${file}:`, result.logs);
      continue;
    }

    const builtContent = await Bun.file(outputPath).text();
    const header = parseHeaderFields(await Bun.file(inputPath).text());

    if (header.deps && isCI) {
      header.deps = parseDeps(header.deps).map((dep) => {
        if (dep.downloadUrl != null) return `${dep.id};${dep.downloadUrl}`;
        return `${dep.id};https://${process.env.GITHUB_REPOSITORY_OWNER}.github.io/${process.env.GITHUB_REPOSITORY_NAME}/${dep.id}.js`;
      }).join(",");
    }

    if (!header.id) {
      header.id = id;
    }

    await Bun.write(
      outputPath,
      `/**\n${
        Object.entries(header).map(([key, value]) => ` * @${key} ${value}`)
          .join("\n")
      }\n */\n\n${builtContent}`,
    );

    if (isCI) {
      manifest.mods.push({
        id,
        name: header.name ?? id,
        downloadUrl:
          `https://${process.env.GITHUB_REPOSITORY_OWNER}.github.io/${process.env.GITHUB_REPOSITORY_NAME}/${id}.js`,
      });
    }

    console.log(
      "Built: " + (header.name ?? id),
    );
  }

  if (isCI) {
    await Bun.write("dist/manifest.json", JSON.stringify(manifest));
    console.log("Generated Manifest!");
  }

  console.log("Build Successful!");
})();
