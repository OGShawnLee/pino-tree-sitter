# tree-sitter-pino 🌲

Tree-sitter grammar and parser for the **Pino** programming language.

## Usage with Zed

In your Zed extension `extension.toml`:

```toml
[grammars.pino]
repository = "https://github.com/OGShawnLee/tree-sitter-pino"
rev = "main"
```

## Development

Generate the C parser:

```bash
bun install
bun run build
# or using npx:
npx tree-sitter generate
```

Run tests:

```bash
npx tree-sitter test
```
