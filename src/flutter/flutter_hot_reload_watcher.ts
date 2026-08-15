import * as vscode from "vscode";

/** Watches project Dart files and coalesces rapid source change notifications. */
export class FlutterHotReloadWatcher implements vscode.Disposable {
  private readonly watcher: vscode.FileSystemWatcher;
  private reloadTimer: NodeJS.Timeout | undefined;
  private pendingChange: Promise<void> = Promise.resolve();

  constructor(
    projectRoot: string,
    private readonly onDidChange: (uri: vscode.Uri) => Promise<void>,
    private readonly output: vscode.OutputChannel,
  ) {
    this.watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(projectRoot, "lib/**/*.dart"),
    );

    this.watcher.onDidChange(this.scheduleReload, this);
    this.watcher.onDidCreate(this.scheduleReload, this);
    this.watcher.onDidDelete(this.scheduleReload, this);
  }

  /** Debounces rapid file events and processes changes in their arrival order. */
  private scheduleReload(uri: vscode.Uri): void {
    if (this.reloadTimer) {
      clearTimeout(this.reloadTimer);
    }

    this.reloadTimer = setTimeout(() => {
      this.pendingChange = this.pendingChange
        .then(() => this.onDidChange(uri))
        .catch((error) => {
          const message =
            error instanceof Error ? error.message : String(error);
          this.output.appendLine(`[source change] ${message}`);
        });
    }, 300); // 300ms
  }

  dispose(): void {
    if (this.reloadTimer) {
      clearTimeout(this.reloadTimer);
    }

    this.watcher.dispose();
  }
}
