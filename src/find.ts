/**
 * Where the language server is, for a project.
 *
 * The server is a Python package, found in the project's environment, or run
 * by `uvx` when the project has none, in this order:
 *
 * 1. the `sqlakit.server.path` setting;
 * 2. `.venv/bin/sqlakit-lsp` in the project;
 * 3. `sqlakit-lsp` on the `PATH`;
 * 4. `uvx sqlakit-lsp`, a release this extension was made for, `SERVERS`,
 *    with the `sqlakit` version the project's `uv.lock` holds.
 *
 * VS Code starts the extension in every Python project, so a project that
 * does not depend on `sqlakit` gets no server, unless the setting names one.
 *
 * Nothing here touches VS Code, so it runs under plain tests.
 */

import { existsSync, readFileSync } from "node:fs"
import { delimiter, join } from "node:path"

export const SERVER = "sqlakit-lsp"

/**
 * The releases of the server this extension runs through `uvx`: the newest
 * fix of one minor version, and never the next one, which may change what an
 * editor is sent.
 */
export const SERVERS = "sqlakit-lsp>=0.4,<0.5"

/** The oldest `sqlakit` the server reads the templates of. */
export const OLDEST: [number, number, number] = [0, 22, 4]

/** The files that say a project depends on `sqlakit`. */
const DEPENDENCIES = ["pyproject.toml", "uv.lock", "requirements.txt", "requirements-dev.txt"]

export interface Command {
  command: string
  args: string[]
}

/** Why no server starts: `quiet` when it is not a SQLAKit project at all. */
export interface Skipped {
  problem: string
  quiet: boolean
}

export interface Where {
  /** The project's directory. */
  root: string
  /** The `sqlakit.server.path` setting, empty when it is not set. */
  path: string
  /** The `sqlakit.server.args` setting. */
  args: string[]
  /** The `PATH` to look in. */
  searched: string
  windows: boolean
}

/** Return how to start the server, or why none starts. */
export function serverCommand(where: Where, exists = existsSync, read = readText): Command | Skipped {
  if (where.path) {
    return { command: where.path, args: where.args }
  }
  if (!DEPENDENCIES.some((file) => namesSqlakit(read(join(where.root, file))))) {
    return { problem: `the project does not depend on sqlakit, so ${SERVER} is not started`, quiet: true }
  }
  const executable = where.windows ? `${SERVER}.exe` : SERVER
  const venv = join(where.root, ".venv", where.windows ? "Scripts" : "bin", executable)
  if (exists(venv)) {
    return { command: venv, args: where.args }
  }
  const onPath = which(executable, where.searched, exists)
  if (onPath) {
    return { command: onPath, args: where.args }
  }
  const uvx = which(where.windows ? "uvx.exe" : "uvx", where.searched, exists)
  if (!uvx) {
    return {
      problem:
        `${SERVER} is not installed: \`pip install ${SERVER}\` in the project's environment, ` +
        "install uv for `uvx`, or set sqlakit.server.path",
      quiet: false,
    }
  }
  const version = lockedVersion(read(join(where.root, "uv.lock")), "sqlakit")
  if (version && !reads(version)) {
    return {
      problem: `${SERVER} reads the templates of sqlakit ${OLDEST.join(".")} and newer, and uv.lock holds sqlakit ${version}`,
      quiet: false,
    }
  }
  const pinned = version ? ["--with", `sqlakit==${version}`] : []
  return { command: uvx, args: [...pinned, "--from", SERVERS, SERVER, ...where.args] }
}

/** Whether a file of dependencies names `sqlakit` itself, not a package whose name holds it. */
export function namesSqlakit(text: string): boolean {
  return /(?<![\w-])sqlakit(?![\w-])/.test(text)
}

/** Whether the server reads the templates of this `sqlakit` version. */
export function reads(version: string): boolean {
  const [major, minor, patch = "0"] = version.split(".")
  const parts = [major, minor, patch].map((part) => Number.parseInt(part ?? "", 10))
  if (parts.some(Number.isNaN)) {
    // A version it cannot read is left to uv, which says what is wrong.
    return true
  }
  for (const [index, part] of parts.entries()) {
    const oldest = OLDEST[index] ?? 0
    if (part !== oldest) {
      return (part ?? 0) > oldest
    }
  }
  return true
}

/** Return the first directory of a `PATH` that holds the executable. */
export function which(executable: string, searched: string, exists = existsSync): string | undefined {
  for (const directory of searched.split(delimiter)) {
    if (directory && exists(join(directory, executable))) {
      return join(directory, executable)
    }
  }
  return undefined
}

/** Return the version of a package a `uv.lock` holds. */
export function lockedVersion(lock: string, name: string): string | undefined {
  const lines = lock.split("\n")
  for (let index = 0; index < lines.length - 1; index++) {
    if (lines[index]?.trim() === `name = "${name}"`) {
      const found = /^version = "([^"]+)"$/.exec(lines[index + 1]?.trim() ?? "")
      return found?.[1]
    }
  }
  return undefined
}

function readText(path: string): string {
  try {
    return readFileSync(path, "utf8")
  } catch {
    return ""
  }
}
