/**
 * Start `sqlakit-lsp` for each folder of the workspace, for its SQL and Python.
 *
 * VS Code takes everything the server offers as it is: problems, completion,
 * hover, definition, references, rename, code actions, colours of macros and
 * parameters, and the rendered SQL the server asks it to open.
 */

import * as vscode from "vscode"
import { LanguageClient, type LanguageClientOptions, type ServerOptions } from "vscode-languageclient/node"

import { serverCommand } from "./find"

const clients = new Map<string, LanguageClient>()
let output: vscode.LogOutputChannel

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  output = vscode.window.createOutputChannel("SQLAKit", { log: true })
  context.subscriptions.push(
    output,
    vscode.commands.registerCommand("sqlakit.restart", restart),
    vscode.workspace.onDidChangeWorkspaceFolders(async (change) => {
      await Promise.all(change.removed.map(stop))
      await Promise.all(change.added.map(start))
    }),
    vscode.workspace.onDidChangeConfiguration(async (change) => {
      if (change.affectsConfiguration("sqlakit.server")) {
        await restart()
      }
    }),
  )
  await Promise.all((vscode.workspace.workspaceFolders ?? []).map(start))
}

export async function deactivate(): Promise<void> {
  await Promise.all([...clients.values()].map((client) => client.stop()))
  clients.clear()
}

async function restart(): Promise<void> {
  await deactivate()
  await Promise.all((vscode.workspace.workspaceFolders ?? []).map(start))
}

async function start(folder: vscode.WorkspaceFolder): Promise<void> {
  const settings = vscode.workspace.getConfiguration("sqlakit", folder)
  const found = serverCommand({
    root: folder.uri.fsPath,
    path: settings.get<string>("server.path", ""),
    args: settings.get<string[]>("server.args", []),
    searched: process.env.PATH ?? "",
    windows: process.platform === "win32",
  })
  if ("problem" in found) {
    output.appendLine(`${folder.name}: ${found.problem}`)
    // A Python project without SQLAKit is none of this extension's business.
    if (!found.quiet) {
      void vscode.window.showWarningMessage(`SQLAKit in ${folder.name}: ${found.problem}.`)
    }
    return
  }
  output.appendLine(`${folder.name}: ${[found.command, ...found.args].join(" ")}`)
  const server: ServerOptions = { command: found.command, args: found.args, options: { cwd: folder.uri.fsPath } }
  // Each folder's files go to its own server.
  const pattern = `${folder.uri.fsPath}/**/*`
  const client: LanguageClientOptions = {
    documentSelector: [
      { scheme: "file", language: "sql", pattern },
      { scheme: "file", language: "python", pattern },
    ],
    workspaceFolder: folder,
    outputChannel: output,
  }
  const started = new LanguageClient("sqlakit", "SQLAKit", server, client)
  clients.set(folder.uri.toString(), started)
  await started.start()
}

async function stop(folder: vscode.WorkspaceFolder): Promise<void> {
  const client = clients.get(folder.uri.toString())
  clients.delete(folder.uri.toString())
  await client?.stop()
}
