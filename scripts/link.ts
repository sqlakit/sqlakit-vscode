/**
 * Link this directory into VS Code's extensions, so VS Code loads it as if it
 * were installed, from the source: `bun run link`, and `bun run unlink` to undo.
 *
 * After `bun run build`, Developer: Reload Window picks up the change.
 */

import { existsSync, lstatSync, mkdirSync, rmSync, symlinkSync } from "node:fs"
import { homedir } from "node:os"
import { join, resolve } from "node:path"

const extensions = join(homedir(), ".vscode", "extensions")
const linked = join(extensions, "sqlakit.sqlakit-dev")
const here = resolve(import.meta.dir, "..")

if (process.argv[2] === "unlink") {
  if (existsSync(linked) || lstatSync(linked, { throwIfNoEntry: false })) {
    rmSync(linked)
    console.log(`removed ${linked}`)
  }
} else {
  mkdirSync(extensions, { recursive: true })
  if (lstatSync(linked, { throwIfNoEntry: false })) {
    rmSync(linked)
  }
  symlinkSync(here, linked, "dir")
  console.log(`${linked} -> ${here}\nrun \`bun run build\`, then Developer: Reload Window in VS Code`)
}
