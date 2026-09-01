import * as vscode from "vscode";
import { PreviewApplication } from "./preview/preview_application.js";
import { PreviewViewProvider } from "./view/preview_view_provider.js";

/**
 * Initializes the extension and registers all resources managed by VS Code.
 *
 * VS Code calls this function once when the extension is activated. Every
 * disposable created here is added to the extension context so it is
 * cleaned up automatically when the Extension Host shuts down.
 */
export function activate(context: vscode.ExtensionContext): void {
  const uri = context.extensionUri;

  // Compose the extension's long-lived services when VS Code activates it.
  const view = new PreviewViewProvider(uri);
  const output = vscode.window.createOutputChannel("Flutter Design Preview");
  const application = new PreviewApplication(view, output, uri);

  // Connect the contributed Open command to the preview workflow.
  const openCommand = vscode.commands.registerCommand(
    "flutterWidgetPreview.open",
    (resource?: vscode.Uri) => application.open(resource),
  );

  // Let the contributed sidebar view obtain its content from this provider.
  const viewRegistration = vscode.window.registerWebviewViewProvider(
    "flutterWidgetPreview.view",
    view,
  );

  // Keep the command and view registered for the extension lifetime, then stop
  // the Flutter Design Preview session and release its UI resources during deactivation.
  context.subscriptions.push(
    output,
    application,
    openCommand,
    viewRegistration,
  );
}
