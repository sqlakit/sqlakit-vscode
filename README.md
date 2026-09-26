# SQLAKit for VS Code

A VS Code extension for [SQLAKit](https://sqlakit.readthedocs.io/en/stable/)
templates. It runs [`sqlakit-lsp`](https://github.com/sqlakit/sqlakit-lsp),
which shows errors as you type, completes macro names and template names,
shows the SQL a macro writes on hover, finds definitions and references, and
renames macros and templates. It needs `sqlakit` 0.21 or newer.

## Install

If [uv](https://docs.astral.sh/uv/) is installed, nothing else is needed: the
extension runs the server with `uvx`. You can also add the server to the
project:

```console
$ uv add --dev sqlakit-lsp
```

## Where the server comes from

The extension uses the first one it finds, for each folder of the workspace:

1. the `sqlakit.server.path` setting
2. `.venv/bin/sqlakit-lsp` in the folder
3. `sqlakit-lsp` on the `PATH`
4. `uvx sqlakit-lsp`, with the `sqlakit` version from the folder's `uv.lock`,
   or the latest server when the folder has no `uv.lock`

The server starts only in folders that list `sqlakit` in `pyproject.toml`,
`uv.lock` or `requirements.txt`. Set `sqlakit.server.path` to start it
anywhere else.

**SQLAKit: Restart Language Server** reads the project again. The **SQLAKit**
output shows how the server was started and what it found in the project.

## Settings

| setting | holds |
| --- | --- |
| `sqlakit.server.path` | path to `sqlakit-lsp` |
| `sqlakit.server.args` | arguments for it |
| `sqlakit.trace.server` | `messages` or `verbose` logs what VS Code and the server send each other |

## Development

```console
$ bun install
$ bun run check     # types
$ bun test          # where the server is found
$ bun run package   # sqlakit-0.1.0.vsix
```

**Extensions: Install from VSIX...** installs the package in VS Code.

To work on the extension without packaging it:

- **F5** in this folder opens a second VS Code with the extension built from
  the source, on `../sqlakit-example`.
- `bun run link` links this folder into `~/.vscode/extensions`, so your own
  VS Code loads it as if it were installed. After `bun run build`,
  **Developer: Reload Window** picks up the change. `bun run unlink` removes
  the link.
