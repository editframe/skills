# Editor Configuration for Monorepo

This monorepo uses git subtrees for `telecine/` and `elements/`. Each subtree has its own TypeScript and Biome configuration.

## Setup

1. **Install dependencies** in each subtree:
   ```bash
   cd telecine && npm install
   cd ../elements && npm install
   ```

2. **Open the workspace file**:
   - Open `monorepo.code-workspace` in VSCode/Cursor
   - This will configure the editor to use the correct TypeScript configs for each subtree

3. **Use workspace TypeScript**:
   - When prompted, select "Use Workspace Version" for TypeScript
   - This ensures the correct TypeScript version from each subtree's node_modules is used

## Configuration Files

- `.vscode/settings.json` - Root-level editor settings
- `monorepo.code-workspace` - Multi-root workspace configuration
- `tsconfig.json` - Root TypeScript config with project references
- `biome.json` - Root Biome config (minimal, subtree configs take precedence)

Each subtree (`telecine/` and `elements/`) has its own:
- `tsconfig.json` - TypeScript configuration
- `biome.json` - Biome linter/formatter configuration
- `node_modules/` - Dependencies (must be installed separately)











