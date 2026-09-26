# SQLAKit for VS Code

Runs [`sqlakit-lsp`](https://github.com/sqlakit/sqlakit-lsp) for the SQL
templates and the Python of a [SQLAKit](https://sqlakit.readthedocs.io/en/stable/)
project:

- the problems `sqlakit check` finds, as you type, with quick fixes
- completion after `tpl.`, of template names in `db.sql("...")`, and of the
  parameters a template reads inside that call
- on hover, the SQL a macro's call writes, and which calls pass a parameter
- go to definition, find references and rename, for macros and templates
- the macros' calls and the parameters coloured
- **Show rendered SQL** in the code actions of a template

## Install

The server is a Python package in your project's environment:

```console
$ uv add --dev sqlakit-lsp     # or: pip install sqlakit-lsp
```

The extension starts the first of these it finds, for each folder of the
workspace:

1. the `sqlakit.server.path` setting;
2. `.venv/bin/sqlakit-lsp` in the folder;
3. `sqlakit-lsp` on the `PATH`;
4. `uvx sqlakit-lsp` when [uv](https://docs.astral.sh/uv/) is installed, with
   the `sqlakit` version the folder's `uv.lock` holds.

**SQLAKit: Restart Language Server** reads the project again. The **SQLAKit**
output shows the command that started the server and what it read of the
project.

## Settings

| setting | holds |
| --- | --- |
| `sqlakit.server.path` | the `sqlakit-lsp` to run |
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
