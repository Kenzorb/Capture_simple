# Capture

Capture is a Chrome extension and web application for saving articles and building a personal knowledge library.

## Development commands

Use the Node.js version in `.nvmrc` and the pnpm version in `package.json`. Install dependencies with `pnpm install --frozen-lockfile`.

| Command                       | Purpose                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| `pnpm dev`                    | Start the web app locally.                                                           |
| `pnpm --filter extension dev` | Start WXT in Chrome MV3 development mode.                                            |
| `pnpm lint`                   | Run ESLint across the workspace.                                                     |
| `pnpm format:check`           | Check formatting on source and documentation covered by Prettier.                    |
| `pnpm format`                 | Apply formatting.                                                                    |
| `pnpm typecheck`              | Generate framework types and check TypeScript.                                       |
| `pnpm test`                   | Run workspace test scripts where present. This is a no-suite baseline until CAP-013. |
| `pnpm build`                  | Build the web and Chrome extension workspaces.                                       |

See [Setup](docs/SETUP.md) for account prerequisites and the [development playbook](docs/DEVELOPMENT_AGENT_PLAYBOOK.md) for current progress.
