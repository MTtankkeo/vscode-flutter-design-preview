import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import { messages } from "../localization.js";
import { widgetId, type PreviewBuilder, type PreviewWidget } from "./models.js";

/** Generates the temporary Flutter Web application used to host discovered widgets. */
export class PreviewRunnerGenerator {
  constructor(private readonly extensionUri: vscode.Uri) {}

  /** Writes a runnable project under `.dart_tool/flutter_widget_preview`. */
  async generate(
    projectRoot: string,
    widgets: PreviewWidget[],
    builder?: PreviewBuilder,
  ): Promise<string> {
    const runner = path.join(
      projectRoot,
      ".dart_tool",
      "flutter_widget_preview",
    );

    const libDirectory = path.join(runner, "lib");
    const webDirectory = path.join(runner, "web");
    const target = path.join(libDirectory, "main.dart");

    await fs.mkdir(libDirectory, { recursive: true });
    await fs.mkdir(webDirectory, { recursive: true });

    const projectPackage = await readPackageName(projectRoot);

    const builderImport = builder
      ? `import 'package:${projectPackage}/${toPackageImport(projectRoot, builder.file)}' as preview_shell;`
      : `import 'preview_default_builder.dart' as preview_shell;`;

    const widgetImports = widgets
      .map(
        (candidate, index) =>
          `import 'package:${projectPackage}/${toPackageImport(projectRoot, candidate.file)}' as preview_widget_${index};`,
      )
      .join("\n");

    const widgetEntries = widgets
      .map(
        (candidate, index) =>
          `  ${dartString(widgetId(candidate))}: preview_widget_${index}.${candidate.className}(),`,
      )
      .join("\n");

    const builderReference = builder
      ? `preview_shell.${builder.name}`
      : `preview_shell.previewDefaultBuilder`;

    const source = await this.renderRunnerTemplate({
      builderImport,
      widgetImports,
      widgetEntries,
      builderReference,
    });

    await fs.rm(path.join(libDirectory, "runner.dart"), { force: true });
    await fs.writeFile(target, source, "utf8");

    if (!builder) {
      const defaultBuilder = await this.readFlutterTemplate(
        "preview_default_builder.dart",
      );

      await fs.writeFile(
        path.join(libDirectory, "preview_default_builder.dart"),
        defaultBuilder,
        "utf8",
      );
    }

    const pubspec = (await this.readFlutterTemplate("runner_pubspec.yaml"))
      .replaceAll("{{projectPackage}}", projectPackage)
      .replaceAll("{{projectPath}}", yamlString(projectRoot));

    const renderIndex = await this.readFlutterTemplate("runner_index.html");

    await fs.writeFile(path.join(runner, "pubspec.yaml"), pubspec, "utf8");
    await fs.writeFile(
      path.join(webDirectory, "index.html"),
      renderIndex,
      "utf8",
    );

    return runner;
  }

  /** Inserts project-specific imports, preview instances, and builder references. */
  private async renderRunnerTemplate(values: {
    builderImport: string;
    widgetImports: string;
    widgetEntries: string;
    builderReference: string;
  }): Promise<string> {
    const template = await this.readFlutterTemplate("runner.dart");
    return template
      .replace("// {{builderImport}}", values.builderImport)
      .replace("// {{widgetImports}}", values.widgetImports)
      .replace("// {{widgetEntries}}", values.widgetEntries)
      .replace(
        "builder: _templateBuilder,",
        `builder: ${values.builderReference},`,
      );
  }

  /** Reads a Dart or pubspec template from the extension's Flutter media bundle. */
  private readFlutterTemplate(name: string): Promise<string> {
    return this.readMediaTemplate("flutter/lib", name);
  }

  /** Reads a bundled template relative to the extension installation directory. */
  private async readMediaTemplate(
    directory: string,
    name: string,
  ): Promise<string> {
    const uri = vscode.Uri.joinPath(
      this.extensionUri,
      "media",
      directory,
      name,
    );

    return fs.readFile(uri.fsPath, "utf8");
  }
}

/** Reads the package name required to construct Dart package imports. */
async function readPackageName(projectRoot: string): Promise<string> {
  const pubspec = await fs.readFile(
    path.join(projectRoot, "pubspec.yaml"),
    "utf8",
  );

  const match = /^name:\s*([A-Za-z_]\w*)\s*$/m.exec(pubspec);
  if (!match) {
    throw new Error(messages.packageNameNotFound);
  }

  return match[1];
}

/** Converts an absolute file path under lib into a Dart package import path. */
function toPackageImport(projectRoot: string, file: string): string {
  return path
    .relative(path.join(projectRoot, "lib"), file)
    .replaceAll("\\", "/");
}

/** Escapes a file-system path for use as a YAML string value. */
function yamlString(value: string): string {
  return JSON.stringify(value.replaceAll("\\", "/"));
}

/** Escapes an arbitrary value for use as a Dart string literal. */
function dartString(value: string): string {
  return JSON.stringify(value).replaceAll("$", "\\$");
}
