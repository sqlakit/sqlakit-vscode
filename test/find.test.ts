import { describe, expect, test } from "bun:test"
import { delimiter, join } from "node:path"

import { lockedVersion, namesSqlakit, reads, serverCommand, type Where } from "../src/find"

const LOCK = `version = 1

[[package]]
name = "sqlakit"
version = "0.21.0"

[[package]]
name = "sqlakit-lsp"
version = "0.1.0"
`

const PYPROJECT = '[project]\nname = "app"\ndependencies = ["sqlakit>=0.21"]\n'

function where(overrides: Partial<Where> = {}): Where {
  return { root: "/app", path: "", args: [], searched: ["/usr/bin", "/tools"].join(delimiter), windows: false, ...overrides }
}

/** Read a project that depends on `sqlakit`, with or without a lock. */
function project(lock = ""): (path: string) => string {
  return (path) => (path.endsWith("pyproject.toml") ? PYPROJECT : path.endsWith("uv.lock") ? lock : "")
}

describe("serverCommand", () => {
  test("the setting wins, in any project", () => {
    const found = serverCommand(where({ path: "/opt/lsp", args: ["--x"] }), () => true, () => "")
    expect(found).toEqual({ command: "/opt/lsp", args: ["--x"] })
  })

  test("a project without sqlakit gets no server, and no warning", () => {
    const found = serverCommand(where(), () => true, () => '[project]\ndependencies = ["flask"]\n')
    expect(found).toEqual({
      problem: "the project does not depend on sqlakit, so sqlakit-lsp is not started",
      quiet: true,
    })
  })

  test("the project's environment comes before the PATH", () => {
    const venv = join("/app", ".venv", "bin", "sqlakit-lsp")
    const found = serverCommand(where(), (path) => path === venv || path === "/usr/bin/sqlakit-lsp", project())
    expect(found).toEqual({ command: venv, args: [] })
  })

  test("the PATH comes before uvx", () => {
    const found = serverCommand(where(), (path) => path === "/tools/sqlakit-lsp" || path === "/usr/bin/uvx", project())
    expect(found).toEqual({ command: "/tools/sqlakit-lsp", args: [] })
  })

  test("uvx runs the server with the sqlakit the project locks", () => {
    const found = serverCommand(where(), (path) => path === "/usr/bin/uvx", project(LOCK))
    expect(found).toEqual({
      command: "/usr/bin/uvx",
      args: ["--with", "sqlakit==0.21.0", "--from", "sqlakit-lsp>=0.2,<0.3", "sqlakit-lsp"],
    })
  })

  test("without a lock, uvx runs a release the extension was made for", () => {
    const found = serverCommand(where({ args: ["--stdio"] }), (path) => path === "/usr/bin/uvx", project())
    expect(found).toEqual({
      command: "/usr/bin/uvx",
      args: ["--from", "sqlakit-lsp>=0.2,<0.3", "sqlakit-lsp", "--stdio"],
    })
  })

  test("a lock of an older sqlakit says so", () => {
    const old = LOCK.replace('version = "0.21.0"', 'version = "0.20.0"')
    const found = serverCommand(where(), (path) => path === "/usr/bin/uvx", project(old))
    expect(found).toEqual({
      problem: "sqlakit-lsp reads the templates of sqlakit 0.21 and newer, and uv.lock holds sqlakit 0.20.0",
      quiet: false,
    })
  })

  test("nothing installed says what to install", () => {
    const found = serverCommand(where(), () => false, project())
    expect(found).toMatchObject({ quiet: false })
    expect("problem" in found && found.problem).toStartWith("sqlakit-lsp is not installed")
  })

  test("Windows looks in Scripts, for an .exe", () => {
    const venv = join("C:/app", ".venv", "Scripts", "sqlakit-lsp.exe")
    const found = serverCommand(where({ root: "C:/app", windows: true }), (path) => path === venv, project())
    expect(found).toEqual({ command: venv, args: [] })
  })
})

describe("namesSqlakit", () => {
  test("finds sqlakit itself", () => {
    expect(namesSqlakit('dependencies = ["sqlakit>=0.21"]')).toBe(true)
    expect(namesSqlakit('dependencies = ["sqlakit[asyncio]"]')).toBe(true)
    expect(namesSqlakit("sqlakit==0.22.0\n")).toBe(true)
    expect(namesSqlakit(LOCK)).toBe(true)
  })

  test("leaves a package that only holds the name", () => {
    expect(namesSqlakit('dependencies = ["sqlakit-debugserver"]')).toBe(false)
    expect(namesSqlakit('dependencies = ["mysqlakitten"]')).toBe(false)
    expect(namesSqlakit('dependencies = ["flask"]')).toBe(false)
  })
})

describe("reads", () => {
  test("the server reads sqlakit from 0.21", () => {
    expect(reads("0.21.0")).toBe(true)
    expect(reads("0.22.3")).toBe(true)
    expect(reads("1.0.0")).toBe(true)
    expect(reads("0.20.0")).toBe(false)
    expect(reads("not a version")).toBe(true)
  })
})

describe("lockedVersion", () => {
  test("reads the version of the package named", () => {
    expect(lockedVersion(LOCK, "sqlakit")).toBe("0.21.0")
    expect(lockedVersion(LOCK, "sqlakit-lsp")).toBe("0.1.0")
    expect(lockedVersion(LOCK, "flask")).toBeUndefined()
  })
})
