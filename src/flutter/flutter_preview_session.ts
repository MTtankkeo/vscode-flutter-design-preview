import * as vscode from "vscode";
import { FlutterProcess } from "./flutter_process.js";
import { FlutterHotReloadWatcher } from "./flutter_hot_reload_watcher.js";

/** Connection details for the Flutter Web server started by a Flutter Design Preview session. */
export interface FlutterPreviewStartResult {
  port: number;
  url: string;
}

/** Coordinates the Flutter process and its project hot-reload watcher. */
export class FlutterPreviewSession implements vscode.Disposable {
  private process: FlutterProcess | undefined;
  private hotReloadWatcher: FlutterHotReloadWatcher | undefined;

  constructor(private readonly output: vscode.OutputChannel) {}

  /** Replaces the current session with a newly started Flutter Design Preview. */
  async start(
    projectRoot: string,
    runnerRoot: string,
    onDidSourceChange: (uri: vscode.Uri) => Promise<void>,
  ): Promise<FlutterPreviewStartResult> {
    this.stop();
    this.output.clear();
    this.output.appendLine(`project: ${projectRoot}`);

    const process = await FlutterProcess.start(runnerRoot, this.output);
    this.process = process;
    this.hotReloadWatcher = new FlutterHotReloadWatcher(
      projectRoot,
      onDidSourceChange,
      this.output,
    );

    return { port: process.port, url: process.url };
  }

  /** Reloads the running preview after its source or generated runner changes. */
  hotReload(): void {
    this.process?.hotReload();
  }

  /** Restarts the running application after its generated entrypoint changes. */
  hotRestart(): void {
    this.process?.hotRestart();
  }

  /** Stops the process and file watcher owned by the current session. */
  stop(): void {
    this.hotReloadWatcher?.dispose();
    this.hotReloadWatcher = undefined;
    this.process?.dispose();
    this.process = undefined;
  }

  dispose(): void {
    this.stop();
  }
}
