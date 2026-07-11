# AudioDN Components

HTML custom elements for the Audio Delivery Network: a `player`, an `uploader`, and a standalone `waveform`. Built with [Lit](https://lit.dev/) and shipped as tree-shakable ES modules.

## Installation

### NPM
```bash
npm install @audiodn/components
```

### Yarn
```bash
yarn add @audiodn/components
```

### CDN
```html
<script type="module" src="https://unpkg.com/@audiodn/components@latest/dist/player.js"></script>
<script type="module" src="https://unpkg.com/@audiodn/components@latest/dist/uploader.js"></script>
```

## Usage

Import only the component you need via its subpath. Each subpath is a separate
entry point, so a bundler will only pull in the code for what you actually use.

### Player Component
```javascript
import '@audiodn/components/player'
// Use the <audiodn-player> element
```

### Uploader Component
```javascript
import '@audiodn/components/uploader'
// Use the <audiodn-uploader> element
```

### Waveform Component
```javascript
import '@audiodn/components/waveform'
// Use the <audiodn-waveform> element
```

### Everything at once
```javascript
import '@audiodn/components'
// Registers <audiodn-player>, <audiodn-uploader>, and <audiodn-waveform>
```

## Tree-shaking & bundling

- The package publishes one ES entry per component (`player`, `uploader`,
  `waveform`) plus a combined `index`. Prefer the **subpath imports** above so
  your bundler only includes the components you use — importing
  `@audiodn/components/uploader` will not pull in the player or waveform code.
- Shared code (Lit, internal utilities, sub-components) is emitted once as
  shared chunks under `dist/shared/` and referenced by the entries, rather than
  being duplicated into each file.
- The player auto-registers the waveform (used for the waveform progress bar);
  it resolves the shared waveform chunk rather than inlining a private copy.
- `lit` is bundled into the package (in its own shared chunk), so no additional
  install is required for CDN/`<script type="module">` usage.

## TypeScript Support

This package includes TypeScript definitions. If you're using TypeScript, you'll get full type safety and IntelliSense support.

## Examples

### Basic Player Usage
```html
<!DOCTYPE html>
<html>
<head>
    <script type="module" src="https://unpkg.com/@audiodn/components@latest/dist/player.js"></script>
</head>
<body>
    <audiodn-player></audiodn-player>
</body>
</html>
```

### Basic Uploader Usage
```html
<!DOCTYPE html>
<html>
<head>
    <script type="module" src="https://unpkg.com/@audiodn/components@latest/dist/uploader.js"></script>
</head>
<body>
    <audiodn-uploader></audiodn-uploader>
</body>
</html>
```

> CDN note: the entry files load a few shared chunks from `dist/shared/`. unpkg
> and jsDelivr resolve these relative imports automatically, so a single
> `<script type="module">` tag is all you need.


Getting started with development
---

1) Clone this repo

    with Git

    ```sh
    git clone https://github.com/audiodn/audiodn-components.git
    ```

    with GitHub CLI

    ```sh
    gh repo clone audiodn/audiodn-components
    ```

2) Install Dependencies & Tooling

    with NPM

    ```sh
    npm setup
    ```

    with Make

    ```sh
    make setup
    ```

3) Start development server

    with NPM

    ```sh
    npm run dev
    ```

    with Make

    ```sh
    make dev
    ```

Linting & Formatting
---

1) Run linter

    with NPM

    ```sh
    npm run lint
    ```

    with Make

    ```sh
    make lint
    ```

2) Autofix formatting

    with NPM

    ```sh
    npm run fmt
    ```

    with Make

    ```sh
    make fmt
    ```

Build Preview
---

1) Run preview command

   Note: _vite preview does not work with library builds_

   with Make
   ```sh
   make preview
   ```

Build Release
---

1) Run build command

    with NPM

    ```sh
    npm run build
    ```

    with Make

    ```sh
    make build
    ```

Check for dependency updates
---

1) Run update command

    with NPM

    ```sh
    npm run update
    ```

    with Make

    ```sh
    make update
```

## Publishing to NPM

To publish this package to npm:

1. **Login to npm** (if not already logged in):
   ```bash
   npm login
   ```

2. **Build the package**:
   ```bash
   npm run build
   ```

3. **Test the package locally** (optional):
   ```bash
   npm pack
   ```

4. **Publish to npm**:
   ```bash
   npm publish
   ```

   Or for a scoped package:
   ```bash
   npm publish --access public
   ```

5. **Update version** (for subsequent releases):
   ```bash
   npm version patch  # for bug fixes
   npm version minor  # for new features
   npm version major  # for breaking changes
   ```

## License

MIT License - see [LICENSE](LICENSE) file for details.
