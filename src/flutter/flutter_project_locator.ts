import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

/** Locates the nearest Flutter project associated with a resource or workspace. */
export class FlutterProjectLocator {
  /** Returns the first candidate whose pubspec declares Flutter support. */
  async find(resource?: vscode.Uri): Promise<string | undefined> {
    const candidates: string[] = [];
    const activePath =
      resource?.fsPath ?? vscode.window.activeTextEditor?.document.uri.fsPath;

    if (activePath) {
      let current = path.extname(activePath)
        ? path.dirname(activePath)
        : activePath;

      while (path.dirname(current) !== current) {
        candidates.push(current);
        current = path.dirname(current);
      }
    }

    for (const folder of vscode.workspace.workspaceFolders ?? []) {
      candidates.push(folder.uri.fsPath);
    }

    for (const candidate of [...new Set(candidates)]) {
      try {
        const contents = await fs.readFile(
          path.join(candidate, "pubspec.yaml"),
          "utf8",
        );

        if (/^\s*flutter\s*:/m.test(contents)) return candidate;
      } catch {
        // Keep looking through workspace candidates.
      }
    }

    return undefined;
  }
}
