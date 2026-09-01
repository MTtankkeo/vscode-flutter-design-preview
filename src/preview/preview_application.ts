import * as vscode from "vscode";
import { FlutterPreviewSession } from "../flutter/flutter_preview_session.js";
import { messages } from "../localization.js";
import { PreviewViewProvider } from "../view/preview_view_provider.js";
import { FlutterProjectLocator } from "../flutter/flutter_project_locator.js";
import type { ActivePreview, PreviewSourceSnapshot } from "./models.js";
import { PreviewRunnerGenerator } from "./preview_runner_generator.js";
import { PreviewSourceDiscovery } from "./preview_source_discovery.js";

/** Coordinates discovery, runner generation, Flutter execution, and sidebar rendering. */
export class PreviewApplication implements vscode.Disposable {
  private readonly projectLocator = new FlutterProjectLocator();
  private readonly sourceDiscovery = new PreviewSourceDiscovery();
  private readonly runnerGenerator: PreviewRunnerGenerator;
  private readonly flutterSession: FlutterPreviewSession;
  private activePreview: ActivePreview | undefined;

  constructor(
    private readonly view: PreviewViewProvider,
    private readonly output: vscode.OutputChannel,
    extensionUri: vscode.Uri,
  ) {
    this.flutterSession = new FlutterPreviewSession(output);
    this.runnerGenerator = new PreviewRunnerGenerator(extensionUri);
  }

  /** Starts a preview for the Flutter project associated with the given resource. */
  async open(resource?: vscode.Uri): Promise<void> {
    const projectRoot = await this.projectLocator.find(resource);
    if (!projectRoot) {
      void vscode.window.showErrorMessage(messages.projectNotFound);
      return;
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: messages.starting,
        cancellable: false,
      },
      async (progress) => {
        this.flutterSession.stop();
        this.activePreview = undefined;

        const source = await this.sourceDiscovery.discover(projectRoot);
        const { builder, widgets } = source;
        if (widgets.length === 0) {
          void vscode.window.showErrorMessage(messages.noWidgets);
          return;
        }

        const selected = widgets[0]; // first widget.
        const runnerRoot = await this.runnerGenerator.generate(
          projectRoot,
          widgets,
          builder,
        );

        await this.view.showLoading();

        try {
          const server = await this.flutterSession.start(
            projectRoot,
            runnerRoot,
            (uri) => this.handleSourceChange(projectRoot, uri),
          );
          this.activePreview = { projectRoot, source };
          await this.view.show(server.url, server.port, widgets, selected);
        } catch (error) {
          this.flutterSession.stop();
          this.activePreview = undefined;
          this.output.show(true);
          const message =
            error instanceof Error ? error.message : String(error);

          void vscode.window.showErrorMessage(messages.previewFailed(message));
        }
      },
    );
  }

  /** Regenerates the runner only when preview declarations have changed. */
  private async handleSourceChange(
    projectRoot: string,
    uri: vscode.Uri,
  ): Promise<void> {
    const active = this.activePreview;
    if (!active || active.projectRoot !== projectRoot) return;

    const source = await this.sourceDiscovery.discover(projectRoot);
    const relativePath = vscode.workspace.asRelativePath(uri);

    if (samePreviewSource(active.source, source)) {
      this.output.appendLine(`[hot reload] ${relativePath}`);
      this.flutterSession.hotReload();
      return;
    }

    if (source.widgets.length === 0) {
      this.output.appendLine(
        `[preview registry] ${relativePath}: no preview widgets found`,
      );
      return;
    }

    await this.runnerGenerator.generate(
      projectRoot,
      source.widgets,
      source.builder,
    );

    // A newer preview session may have replaced this one while discovery ran.
    if (this.activePreview !== active) return;

    active.source = source;
    this.output.appendLine(`[preview registry] ${relativePath}`);
    this.flutterSession.hotRestart();
    await this.view.updateWidgets(source.widgets);
  }

  /** Stops the Flutter process and releases its file watcher. */
  dispose(): void {
    this.activePreview = undefined;
    this.flutterSession.dispose();
  }
}

/** Compares the source-derived data that affects the runner or sidebar. */
function samePreviewSource(
  left: PreviewSourceSnapshot,
  right: PreviewSourceSnapshot,
): boolean {
  if (
    left.builder?.name !== right.builder?.name ||
    left.builder?.file !== right.builder?.file ||
    left.widgets.length !== right.widgets.length
  ) {
    return false;
  }

  return left.widgets.every((widget, index) => {
    const other = right.widgets[index];
    return (
      widget.className === other.className &&
      widget.displayName === other.displayName &&
      widget.groupName === other.groupName &&
      widget.file === other.file
    );
  });
}
