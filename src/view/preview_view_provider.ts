import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import * as vscode from "vscode";
import { messages } from "../localization.js";
import { widgetId, type PreviewWidget } from "../preview/models.js";

/**
 * Snapshot of the running preview required to render the sidebar.
 * It is stored separately from the Webview so the UI can be recreated later.
 */
interface PreviewViewContent {
  url: string;
  port: number;
  widgets: PreviewWidget[];
  selected: PreviewWidget;
}

/**
 * Owns the Flutter Design Preview sidebar and renders it from the current runner state.
 * The provider keeps its state even while VS Code has not created the view yet.
 */
export class PreviewViewProvider implements vscode.WebviewViewProvider {
  private view: vscode.WebviewView | undefined;
  private content: PreviewViewContent | undefined;

  constructor(private readonly extensionUri: vscode.Uri) {}

  /** Connects the provider to the WebviewView instance created by VS Code. */
  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    this.view.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.extensionUri, "media", "view"),
      ],
    };

    void this.render();

    view.webview.onDidReceiveMessage((message) => {
      if (message?.command === "openPreview") {
        void vscode.commands.executeCommand("flutterWidgetPreview.open");
      } else if (message?.command === "selectWidget") {
        this.selectWidget(message.id);
      }
    });

    view.onDidDispose(() => {
      if (this.view === view) this.view = undefined;
    });
  }

  /** Reveals the sidebar and replaces its current content with a loading state. */
  async showLoading(): Promise<void> {
    this.content = undefined;

    await this.reveal();

    if (this.view) {
      const html = await this.readTemplate("loading_preview.html");
      const styleUri = this.view.webview.asWebviewUri(
        vscode.Uri.joinPath(
          this.extensionUri,
          "media",
          "view",
          "style",
          "loading_preview.css",
        ),
      );

      this.view.webview.html = html
        .replaceAll("{{cspSource}}", this.view.webview.cspSource)
        .replaceAll("{{styleUri}}", styleUri.toString())
        .replaceAll("{{loading}}", messages.loading);
    }
  }

  /** Stores a running Flutter server and renders its available widget entries. */
  async show(
    url: string,
    port: number,
    widgets: PreviewWidget[],
    selected: PreviewWidget,
  ): Promise<void> {
    // Prevent the Webview from reusing a document from an earlier Flutter run.
    const query = new URLSearchParams({
      preview: String(Date.now()),
    });

    this.content = {
      url: `${url.replace("127.0.0.1", "localhost")}/?${query.toString()}`,
      port,
      widgets,
      selected,
    };

    await this.reveal();
    await this.render();
  }

  /** Replaces the widget list while retaining the selected widget when possible. */
  async updateWidgets(widgets: PreviewWidget[]): Promise<void> {
    if (!this.content || widgets.length === 0) return;

    const selectedId = widgetId(this.content.selected);
    this.content.widgets = widgets;
    this.content.selected =
      widgets.find((widget) => widgetId(widget) === selectedId) ?? widgets[0];
    await this.render();
  }

  /** Mirrors Webview selection so list refreshes can preserve it. */
  private selectWidget(id: unknown): void {
    if (!this.content || typeof id !== "string") return;
    const selected = this.content.widgets.find(
      (widget) => widgetId(widget) === id,
    );
    if (selected) this.content.selected = selected;
  }

  /** Opens the extension's Activity Bar container when it is currently hidden. */
  private async reveal(): Promise<void> {
    await vscode.commands.executeCommand(
      "workbench.view.extension.flutterWidgetPreview",
    );
  }

  /** Renders either the empty state or the active Flutter Design Preview from templates. */
  private async render(): Promise<void> {
    if (!this.view) return;
    if (!this.content) {
      const nonce = randomBytes(16).toString("base64");
      const styleUri = this.view.webview.asWebviewUri(
        vscode.Uri.joinPath(
          this.extensionUri,
          "media",
          "view",
          "style",
          "empty_preview.css",
        ),
      );

      this.view.webview.html = (await this.readTemplate("empty_preview.html"))
        .replaceAll("{{nonce}}", nonce)
        .replaceAll("{{cspSource}}", this.view.webview.cspSource)
        .replaceAll("{{styleUri}}", styleUri.toString())
        .replaceAll("{{openPrompt}}", messages.openPrompt)
        .replaceAll("{{openPreview}}", messages.openPreview);

      return;
    }

    // of PreviewViewContent
    const { url, port, widgets, selected } = this.content;

    this.view.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.extensionUri, "media", "view"),
      ],
      portMapping: [{ webviewPort: port, extensionHostPort: port }],
    };

    const widgetItems = widgets.map((widget) => ({
      id: widgetId(widget),
      name: widget.displayName,
      group: widget.groupName ?? messages.otherGroup,
    }));

    const nonce = randomBytes(16).toString("base64");
    const scriptUri = this.view.webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.extensionUri,
        "media",
        "view",
        "script",
        "preview.js",
      ),
    );

    const styleUri = this.view.webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.extensionUri,
        "media",
        "view",
        "style",
        "preview.css",
      ),
    );

    const previewData = JSON.stringify({
      widgets: widgetItems,
      selectedId: widgetId(selected),
      translations: {
        searchWidgets: messages.searchWidgets,
        resizeList: messages.resizeList,
        resizeControls: messages.resizeControls,
        controls: messages.controls,
        theme: messages.theme,
        systemTheme: messages.systemTheme,
        lightTheme: messages.lightTheme,
        darkTheme: messages.darkTheme,
        noControls: messages.noControls,
        defaultOption: messages.defaultOption,
        noneOption: messages.noneOption,
      },
    }).replaceAll("<", "\\u003c");

    this.view.webview.html = (await this.readTemplate("preview.html"))
      .replaceAll("{{nonce}}", nonce)
      .replaceAll("{{url}}", url)
      .replaceAll("{{port}}", String(port))
      .replaceAll("{{cspSource}}", this.view.webview.cspSource)
      .replaceAll("{{previewData}}", previewData)
      .replaceAll("{{scriptUri}}", scriptUri.toString())
      .replaceAll("{{styleUri}}", styleUri.toString());
  }

  /** Reads an HTML template bundled with the extension. */
  private async readTemplate(name: string): Promise<string> {
    const uri = vscode.Uri.joinPath(
      this.extensionUri,
      "media",
      "view",
      "html",
      name,
    );

    return fs.readFile(uri.fsPath, "utf8");
  }
}
