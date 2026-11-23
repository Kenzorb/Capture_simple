# Capture

Capture is a Chrome extension and web application for saving articles and building a personal knowledge library.

## Run locally

Install the Node.js version in `.nvmrc` and use pnpm `10.19.0`, as pinned in `package.json`. Corepack users can run `corepack enable pnpm` to enable the pnpm command. If the shim is unavailable, replace `pnpm` in the commands below with `npx --yes pnpm@10.19.0`. Use `pnpm.cmd` or `npx.cmd` in PowerShell when script execution policy blocks the corresponding PowerShell shim.

```sh
pnpm install --frozen-lockfile
pnpm dev --hostname 127.0.0.1
```

Open `http://127.0.0.1:3000`. The web and extension can start without provider credentials. For environment setup, local services, and Chrome installation, see [Setup](docs/SETUP.md#local-startup).

## Organize topics

Open **Knowledge Tree** and select a topic. Use **Edit topic** to rename it or change its **Parent topic**. Choose **Top level** to move the topic and its subtopics to the top of the tree. Topic names must be unique within the same parent, and trees can be up to four levels deep.

To consolidate captures under one topic, open each capture, choose the destination under **Move to topic**, and select **Save primary topic**. This replaces the capture's primary topic and keeps its other topic links. Your primary choice survives AI reprocessing. Bulk topic merging is deferred until after the MVP.

## Development commands

| Command                       | Purpose                                                           |
| ----------------------------- | ----------------------------------------------------------------- |
| `pnpm dev`                    | Start the web app locally.                                        |
| `pnpm --filter extension dev` | Start WXT in Chrome MV3 development mode.                         |
| `pnpm lint`                   | Run ESLint across the workspace.                                  |
| `pnpm format:check`           | Check formatting on source and documentation covered by Prettier. |
| `pnpm format`                 | Apply formatting.                                                 |
| `pnpm typecheck`              | Generate framework types and check TypeScript.                    |
| `pnpm test`                   | Run Vitest unit and DOM component tests.                          |
| `pnpm test:browser`           | Start the web app and run Chromium smoke tests.                   |
| `pnpm build`                  | Build the web and Chrome extension workspaces.                    |

See [Setup](docs/SETUP.md) for account prerequisites and the [development playbook](docs/DEVELOPMENT_AGENT_PLAYBOOK.md) for current progress.
