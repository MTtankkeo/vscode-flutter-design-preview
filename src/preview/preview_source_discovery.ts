import { promises as fs } from "node:fs";
import * as path from "node:path";
import type {
  PreviewBuilder,
  PreviewSourceSnapshot,
  PreviewWidget,
} from "./models.js";

/** Extracts preview declarations from Dart source files without running the project. */
export class PreviewSourceDiscovery {
  /** Discovers the custom builder and all preview widgets under the project's lib directory. */
  async discover(projectRoot: string): Promise<PreviewSourceSnapshot> {
    const files = await collectDartFiles(path.join(projectRoot, "lib"));
    return {
      builder: await this.findBuilder(files),
      widgets: await this.findWidgets(files),
    };
  }

  /** Finds the first top-level Widget function marked with `@preview`. */
  private async findBuilder(
    files: string[],
  ): Promise<PreviewBuilder | undefined> {
    const pattern =
      /@preview\s+(?:[\w<>?]+\s+)*Widget\s+([A-Za-z]\w*)\s*\(\s*PreviewWidget\s+\w+\s*\)/m;

    for (const file of files) {
      const match = pattern.exec(await fs.readFile(file, "utf8"));
      if (match) {
        return { name: match[1], file };
      }
    }

    return undefined;
  }

  /** Extracts PreviewWidget subclasses and their display metadata from Dart sources. */
  private async findWidgets(files: string[]): Promise<PreviewWidget[]> {
    const widgets: PreviewWidget[] = [];
    const classPattern = /class\s+([A-Za-z]\w*)\s+extends\s+PreviewWidget\b/g;

    for (const file of files) {
      const source = await fs.readFile(file, "utf8");
      const matches = [...source.matchAll(classPattern)];

      for (let index = 0; index < matches.length; index += 1) {
        const match = matches[index];
        const className = match[1];
        const end = matches[index + 1]?.index ?? source.length;
        const classSource = source.slice(match.index, end);

        const displayName =
          /String\s+get\s+displayName\s*=>\s*['"]([^'"]+)['"]/.exec(
            classSource,
          )?.[1] ?? className;

        const groupName =
          /String\??\s+get\s+groupName\s*=>\s*['"]([^'"]+)['"]/.exec(
            classSource,
          )?.[1];

        widgets.push({ className, displayName, groupName, file });
      }
    }
    return widgets;
  }
}

/** Recursively collects Dart source files in deterministic path order. */
async function collectDartFiles(directory: string): Promise<string[]> {
  let entries: import("node:fs").Dirent[];
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }

  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectDartFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith(".dart")) {
      files.push(fullPath);
    }
  }

  return files.sort();
}
