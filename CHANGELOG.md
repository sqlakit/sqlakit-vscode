# Changelog

## 0.1.1

- Runs `sqlakit-lsp` 0.4, which renders templates with `sqlakit`'s own code,
  and so needs `sqlakit` 0.22.4 or newer. A project on an older `sqlakit` is
  told so.

## 0.1.0

- Runs `sqlakit-lsp` for each folder of the workspace that depends on
  `sqlakit`, found in the settings, the folder's `.venv`, the `PATH`, or
  through `uvx`.
