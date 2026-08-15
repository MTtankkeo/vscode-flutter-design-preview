import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import * as net from "node:net";
import * as vscode from "vscode";
import { messages } from "../localization.js";

/** Owns a Flutter machine process and the commands sent to it. */
export class FlutterProcess implements vscode.Disposable {
  private requestId = 1;

  private constructor(
    private readonly child: ChildProcessWithoutNullStreams,
    readonly port: number,
    readonly appId: string,
  ) {}

  get url(): string {
    return `http://127.0.0.1:${this.port}`;
  }

  /** Starts Flutter Web and resolves after the machine protocol reports app.started. */
  static async start(
    runnerRoot: string,
    output: vscode.OutputChannel,
  ): Promise<FlutterProcess> {
    const port = await getAvailablePort();
    const flutterArgs = [
      "run",
      "--machine",
      "-d",
      "web-server",
      "--web-hostname",
      "127.0.0.1",
      "--web-port",
      String(port),
      "-t",
      "lib/main.dart",
    ];

    const command =
      process.platform === "win32"
        ? (process.env.ComSpec ?? "cmd.exe")
        : "flutter";

    const args =
      process.platform === "win32"
        ? ["/d", "/s", "/c", "flutter.bat", ...flutterArgs]
        : flutterArgs;

    output.appendLine(`cwd: ${runnerRoot}`);
    output.appendLine(`command: ${command} ${args.join(" ")}`);

    const child = spawn(command, args, { cwd: runnerRoot });
    child.stdout.on("data", (data: Buffer) => output.append(data.toString()));
    child.stderr.on("data", (data: Buffer) => output.append(data.toString()));
    child.on("error", (error) =>
      output.appendLine(`spawn error: ${error.message}`),
    );

    try {
      const appId = await waitForStarted(child);
      return new FlutterProcess(child, port, appId);
    } catch (error) {
      stopProcess(child);
      throw error;
    }
  }

  /** Requests a Flutter hot reload through the machine protocol. */
  hotReload(): void {
    this.reload(false);
  }

  /** Restarts the Flutter application so changes to main() take effect. */
  hotRestart(): void {
    this.reload(true);
  }

  private reload(fullRestart: boolean): void {
    if (this.child.exitCode !== null || !this.child.stdin.writable) return;

    const request = [
      {
        id: this.requestId++,
        method: "app.restart",
        params: {
          appId: this.appId,
          fullRestart,
          reason: fullRestart ? "preview registry change" : "source change",
        },
      },
    ];
    this.child.stdin.write(`${JSON.stringify(request)}\n`);
  }

  dispose(): void {
    stopProcess(this.child);
  }
}

/** Waits for Flutter to publish both an application ID and its started event. */
function waitForStarted(
  child: ChildProcessWithoutNullStreams,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(messages.startupTimeout));
    }, 120_000); // 2 minutes

    let bufferedOutput = "";
    let appId: string | undefined;

    const onData = (data: Buffer) => {
      bufferedOutput = `${bufferedOutput}${data.toString()}`.slice(-32_000);
      appId ??= /"appId"\s*:\s*"([^"]+)"/.exec(bufferedOutput)?.[1];
      if (appId && /"event"\s*:\s*"app\.started"/.test(bufferedOutput)) {
        cleanup();
        resolve(appId);
      }
    };

    const onExit = (code: number | null) => {
      cleanup();
      reject(new Error(messages.processExited(code)));
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    const cleanup = () => {
      clearTimeout(timeout);
      child.stdout.off("data", onData);
      child.off("exit", onExit);
      child.off("error", onError);
    };

    child.stdout.on("data", onData);
    child.once("exit", onExit);
    child.once("error", onError);
  });
}

/** Terminates Flutter and its child processes on the current platform. */
function stopProcess(child: ChildProcessWithoutNullStreams): void {
  if (child.killed || child.exitCode !== null) return;
  if (process.platform === "win32" && child.pid) {
    spawn("taskkill.exe", ["/pid", String(child.pid), "/T", "/F"], {
      windowsHide: true,
    });
  } else {
    child.kill();
  }
}

/** Reserves an available local TCP port for the Flutter Web server. */
function getAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}
