# AudioDN Components

HTML custom elements for the Audio Delivery Network: a `player`, an `uploader`, a `recorder`, and a standalone `waveform`. Built with [Lit](https://lit.dev/) and shipped as tree-shakable ES modules.

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

Every component has its own ES-module entry you can load directly — request only
the one(s) you need. Each entry pulls in its shared chunks automatically (unpkg
and jsDelivr resolve the relative imports for you), so a single `<script>` tag is
all that's required.

```html
<!-- Player -->
<script type="module" src="https://unpkg.com/@audiodn/components@latest/dist/player.js"></script>
<audiodn-player
  api-key="YOUR_CLIENT_SIDE_PLAYER_KEY"
  scope="collection"
  id="COLLECTION_ID"
></audiodn-player>

<!-- Uploader -->
<script type="module" src="https://unpkg.com/@audiodn/components@latest/dist/uploader.js"></script>
<audiodn-uploader
  api-key="YOUR_CLIENT_SIDE_UPLOAD_KEY"
  collection-id="COLLECTION_ID"
></audiodn-uploader>

<!-- Recorder -->
<script type="module" src="https://unpkg.com/@audiodn/components@latest/dist/recorder.js"></script>
<audiodn-recorder
  api-key="YOUR_CLIENT_SIDE_UPLOAD_KEY"
  collection-id="COLLECTION_ID"
></audiodn-recorder>

<!-- Waveform -->
<script type="module" src="https://unpkg.com/@audiodn/components@latest/dist/waveform.js"></script>
<audiodn-waveform variant="reflection"></audiodn-waveform>
```

> Prefer [jsDelivr](https://www.jsdelivr.com/)? Swap the host, e.g.
> `https://cdn.jsdelivr.net/npm/@audiodn/components@latest/dist/player.js`.

## Usage

Import only the component you need via its subpath. Each subpath is a separate
entry point, so a bundler will only pull in the code for what you actually use.

| Import | Registers element |
|--------|-------------------|
| `import '@audiodn/components/player'` | `<audiodn-player>` |
| `import '@audiodn/components/uploader'` | `<audiodn-uploader>` |
| `import '@audiodn/components/recorder'` | `<audiodn-recorder>` |
| `import '@audiodn/components/waveform'` | `<audiodn-waveform>` |
| `import '@audiodn/components'` | all four |

Once imported, drop the element into your HTML. All configuration is done through
HTML attributes (documented per component below). Attribute values are strings in
markup; number/boolean attributes are coerced automatically.

---

## `<audiodn-player>`

An audio player that opens a play session against the AudioDN API and renders
cover art, a tracklist, transport controls, and a waveform progress bar.

```javascript
import '@audiodn/components/player'
```

```html
<audiodn-player
  api-key="YOUR_CLIENT_SIDE_PLAYER_KEY"
  scope="collection"
  id="COLLECTION_ID"
  variants="hq,lq"
  size="large"
></audiodn-player>
```

You must provide **either** `api-key` (the player creates the session) **or**
`play-session-id` (you created the session server-side).

### Attributes

| Attribute | Type | Default | Description / possible values |
|-----------|------|---------|-------------------------------|
| `api-key` | string | — | Client-side player API key. The player creates a play session for `scope`/`id`. Provide this **or** `play-session-id`. |
| `play-session-id` | string | — | Use an existing play session instead of creating one with `api-key`. |
| `scope` | string | `""` | The kind of resource `id` refers to. Values: `track`, `collection`. |
| `id` | string | `""` | ID of the track or collection to play (must match `scope`). |
| `variants` | string | `""` | Comma-separated variant indexes to request, in priority order — the **first is selected by default**. e.g. `"hq,lq"`. |
| `size` | string | `large` | Layout preset. Values: `small`, `regular`, `large`. |
| `locale` | string | `en` | UI language. Values: `en`, `fr`, `es`, `de`. |
| `volume` | number | `0.7` | Initial volume, `0`–`1`. Persisted to `sessionStorage` after the user changes it. |
| `session-ttl` | number | — | Requested play-session lifetime, in seconds. |
| `waveform-variant` | string | `vertical` | Waveform style. Values: `vertical`, `reflection`, `wavy`. |
| `waveform-height` | number | `120` | Waveform height, in px. |
| `waveform-line-width` | number | `2` | Waveform bar width, in px. |
| `waveform-line-color` | string | `#888888` | Waveform color (any CSS color). Overridden by the track's accent color when available. |
| `waveform-gap` | number | `3` | Gap between waveform bars, in px. |
| `waveform-scale-strength` | number | `0.4` | Waveform contrast/normalization, `0`–`1`. |

### Events

All events bubble and are composed (cross shadow DOM).

| Event | `detail` | Fired when |
|-------|----------|------------|
| `adn-session-refreshed` | `{ playSessionId }` | The session was auto-refreshed (only when `api-key` is set). |
| `adn-session-expired` | `{ playSessionId }` | The session expired and could not be refreshed (no `api-key`). |

---

## `<audiodn-uploader>`

A drag-and-drop uploader that opens an upload session and PUTs audio files
directly to storage with per-file and overall progress.

The `file-uploaded` event means the bytes were accepted by storage for that
track — not that AudioDN has finished processing. Poll
`GET /v1/track/:track_id` until `track_status_id` is `ready` (or wait for a
track webhook) before playing the track.

```javascript
import '@audiodn/components/uploader'
```

```html
<audiodn-uploader
  api-key="YOUR_CLIENT_SIDE_UPLOAD_KEY"
  collection-id="COLLECTION_ID"
  accent-color="#ff00ff"
></audiodn-uploader>
```

You must provide **either** `api-key` (the uploader creates the session) **or**
`upload-session-id` (you created the session server-side). Only `audio/*` files
are accepted. Use `limit` to cap how many files may be uploaded while the
component is mounted (omit or `0` for unlimited; a page refresh resets the count).

### Attributes

| Attribute | Type | Default | Description / possible values |
|-----------|------|---------|-------------------------------|
| `api-key` | string | — | Client-side upload API key. The uploader creates an upload session. Provide this **or** `upload-session-id`. |
| `upload-session-id` | string | — | Use an existing upload session instead of creating one with `api-key`. |
| `collection-id` | string | — | Collection to upload tracks into (used with `api-key`). |
| `accent-color` | string | `#fe008a` | Accent color for the UI. Must be a 6-digit hex color, e.g. `#ff00ff`. Falls back to the collection's color when not set. |
| `locale` | string | `en` | UI language. Values: `en`, `fr`, `es`, `de`. |
| `disabled` | boolean | `false` | Disables the drop zone and file picker. Presence of the attribute = `true`. |
| `limit` | number | `0` | Max files that may be uploaded for this component instance. `0` / unset = unlimited. Counts accepted files for the lifetime of the element (even after they leave the queue). `1` forces single-file picker mode. |

### Events

All events bubble and are composed.

| Event | `detail` | Fired when |
|-------|----------|------------|
| `files-selected` | `{ files }` | Audio files are chosen or dropped. |
| `file-uploaded` | `{ file, trackId }` | Bytes finished uploading to storage. Does **not** mean the track is `ready` — wait for processing before playback. |
| `session-error` | `{ error }` | The upload session could not be created or fetched. |
| `adn-session-refreshed` | `{ uploadSessionId }` | The session was auto-refreshed (only when `api-key` is set). |
| `adn-session-expired` | `{ uploadSessionId }` | The session expired and could not be refreshed. |

---

## `<audiodn-recorder>`

A voice recorder that captures microphone audio in the browser, lets the user
preview it with a mini player + waveform, and uploads a single track to AudioDN.

With an `api-key`, the recorder creates the upload session **and** the track in
one request (`POST /v1/upload_session` with a nested `track` object), then PUTs
the recording. With an `upload-session-id`, it creates the track inside that
session like the uploader.

Filenames are generated automatically from the UTC timestamp (e.g.
`voice-2026-07-21T23-51-00Z.webm`). The browser picks a supported mime type,
preferring Opus in WebM/Ogg, then MP4/AAC on Safari.

The `file-uploaded` event means the bytes were accepted by storage — not that
AudioDN has finished processing. Poll `GET /v1/track/:track_id` until
`track_status_id` is `ready` (or wait for a track webhook) before playing.

```javascript
import '@audiodn/components/recorder'
```

```html
<audiodn-recorder
  api-key="YOUR_CLIENT_SIDE_UPLOAD_KEY"
  collection-id="COLLECTION_ID"
  accent-color="#7c3aed"
  theme="light"
></audiodn-recorder>
```

You must provide **either** `api-key` **or** `upload-session-id`.

### Attributes

| Attribute | Type | Default | Description / possible values |
|-----------|------|---------|-------------------------------|
| `api-key` | string | — | Client-side upload API key. Creates session + track on send. Provide this **or** `upload-session-id`. |
| `upload-session-id` | string | — | Use an existing upload session instead of creating one with `api-key`. |
| `collection-id` | string | — | Collection to upload into (used with `api-key`). |
| `accent-color` | string | `#fe008a` | Accent color for the UI. 6-digit hex preferred (also sent as `player_color` when uploading via `api-key`). |
| `theme` | string | `auto` | Color scheme. Values: `auto`, `light`, `dark`. |
| `locale` | string | `en` | UI language. Values: `en`, `fr`, `es`, `de`. |
| `disabled` | boolean | `false` | Disables recording controls. |
| `max-duration` | number | `0` | Max recording length in seconds. `0` = unlimited. |
| `countdown` | number | `3` | Pre-record countdown length (`3` → 3‑2‑1). `0` skips the countdown and starts immediately. |
| `auto-hide` | boolean | `false` | After a successful upload, sets the host to `display: none`. |
| `variant` | string | `panel` | Layout preset. Currently only `panel`. |

### Events

All events bubble and are composed. Listen for `file-uploaded` when the PUT finishes
(this is the “upload complete” signal for hosts — it does **not** mean processing is
`ready`):

```html
<audiodn-recorder
  api-key="YOUR_CLIENT_SIDE_UPLOAD_KEY"
  collection-id="COLLECTION_ID"
  locale="fr"
  countdown="3"
  auto-hide
></audiodn-recorder>

<script type="module">
  const recorder = document.querySelector('audiodn-recorder')
  recorder.addEventListener('file-uploaded', (e) => {
    const { trackId, fileName, blob } = e.detail
    console.log('uploaded', trackId, fileName, blob.size)
  })
</script>
```

| Event | `detail` | Fired when |
|-------|----------|------------|
| `recording-started` | — | Microphone capture actually began (after the countdown, if any). |
| `recording-stopped` | `{ blob, duration }` | Recording finished; preview is ready. |
| `recording-discarded` | — | User discarded the clip (or cancelled mid-record/mid-countdown). |
| `upload-progress` | `{ percent }` | PUT upload progress (0–100). |
| `file-uploaded` | `{ trackId, fileName, blob }` | Bytes finished uploading to storage. Does **not** mean the track is `ready`. |
| `session-error` | `{ error }` | An existing upload session could not be fetched. |
| `adn-session-refreshed` | `{ uploadSessionId }` | A new session was created on send (api-key path). |
| `adn-session-expired` | `{ uploadSessionId }` | A pre-created session expired. |

---

## `<audiodn-waveform>`

A standalone canvas waveform with hover-scrub, a playhead, and click/tap to
seek. The player embeds this internally, but you can use it on its own by
feeding it amplitude `levels`.

```javascript
import '@audiodn/components/waveform'
```

```html
<audiodn-waveform variant="reflection" height="120"></audiodn-waveform>

<script type="module">
  const wf = document.querySelector('audiodn-waveform')
  wf.levels = [0.1, 0.4, 0.8, 0.6, ...] // amplitude samples (set as a JS property)
  wf.duration = 214                      // seconds, enables the hover tooltip
  wf.progress = 0.35                     // 0–1, moves the playhead
</script>
```

> `levels` is an array, so set it as a **JS property** (`el.levels = [...]`)
> rather than an HTML attribute.

### Attributes / properties

| Attribute | Type | Default | Description / possible values |
|-----------|------|---------|-------------------------------|
| `levels` (property) | number[] | `[]` | Amplitude samples to draw. Set via JS property. |
| `variant` | string | `vertical` | Render style. Values: `vertical`, `reflection`, `wavy`. |
| `height` | number | `120` | Canvas height, in px. |
| `line-color` | string | `#888888` | Bar color (any CSS color). |
| `line-width` | number | `2` | Bar width, in px. |
| `gap` | number | `3` | Gap between bars, in px. |
| `scale-strength` | number | `0.4` | Contrast/normalization, `0`–`1`. |
| `progress` | number | `0` | Playback position, `0`–`1`. Drives the playhead. |
| `duration` | number | `0` | Track length in seconds. Enables the hover-time tooltip. |
| `min` | number | `0` | Start of the playable/preview region, `0`–`1`. |
| `max` | number | `1` | End of the playable/preview region, `0`–`1`. |
| `reflection-angle` | number | `45` | `reflection` variant: max lean in degrees (at 0%/100% progress). |
| `reflection-size` | number | `0.25` | `reflection` variant: reflection height as a fraction of the bar height. |
| `reflection-opacity` | number | `0.55` | `reflection` variant: reflection opacity at the baseline. |
| `highlight-from` | number | `0` | Left offset (px) of the progress highlight mask. |
| `highlight-width` | number | `1` | Highlight width as a fraction of the container. |
| `locale` | string | `en` | Language for the ARIA label. Values: `en`, `fr`, `es`, `de`. |

### Events

| Event | `detail` | Fired when |
|-------|----------|------------|
| `adni-seek` | `{ percent }` | The user clicks or taps to seek. `percent` is `0`–`1`. |

---

## Theming

Both the player and uploader ship a light and dark palette, selected with the
`theme` attribute:

```html
<audiodn-player theme="auto" ...></audiodn-player>   <!-- default -->
<audiodn-player theme="dark" ...></audiodn-player>
<audiodn-player theme="light" ...></audiodn-player>
```

- `auto` (default) follows the visitor's `prefers-color-scheme` and switches
  live when the OS/browser setting changes.
- `dark` is white text on a dark background; `light` is dark text on a soft
  light-gray background.
- The accent stays legible in both: the player uses the contrast-safe
  `player_color_dark` / `player_color_light` variant for the active theme, and
  the uploader tints its `accent-color` (only when needed) to clear a minimum
  contrast against the background.

For finer control, both components are also themable via `--adn-*` CSS custom
properties set on the element (or an ancestor), which override the palette.
Common ones:

```css
audiodn-player,
audiodn-uploader {
  --adn-bg: #0b0b0b;             /* background */
  --adn-color-font: #fff;        /* text */
  --adn-color-font-muted: #bbb;  /* secondary text */
  --adn-color-accent: #c13c5b;   /* accent (also the uploader's default accent) */
  --adn-radius: 8px;             /* corner radius */
  --adn-padding: 0;              /* inner padding */
  --adn-box-shadow: none;        /* outer shadow */
}
```

The uploader's accent can also be set with the `accent-color` attribute (above).

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

## Full-page example (CDN)

```html
<!DOCTYPE html>
<html>
<head>
  <script type="module" src="https://unpkg.com/@audiodn/components@latest/dist/player.js"></script>
</head>
<body>
  <audiodn-player
    api-key="YOUR_CLIENT_SIDE_PLAYER_KEY"
    scope="collection"
    id="COLLECTION_ID"
    variants="hq,lq"
    size="large"
  ></audiodn-player>

  <script type="module">
    document.querySelector('audiodn-player')
      .addEventListener('adn-session-expired', () => location.reload())
  </script>
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

## Releasing a new version

Releases are published **manually** to npm from a maintainer's machine. There is
no CI publish step (npm's read/write granular tokens expire every 90 days, which
makes automation impractical for an infrequently released package).

You need to be logged in as an npm user who is a member of the `@audiodn` org
with publish rights:

```bash
npm login          # one-time, per machine
npm whoami         # confirm you're logged in
```

Then, for each release:

1. **Land your code change** on `main` (commit / merge as usual).

2. **Bump the version.** This updates `package.json` and creates a git tag:
   ```bash
   npm version patch   # bug fixes        (0.1.0 -> 0.1.1)
   npm version minor   # new features     (0.1.0 -> 0.2.0)
   npm version major   # breaking changes (0.1.0 -> 1.0.0)
   ```

3. **Publish.** `prepublishOnly` automatically runs lint + tests + build first,
   so a broken build or failing test aborts the publish:
   ```bash
   npm publish
   ```
   > `access: public` is already set in `publishConfig`, so no extra flag is
   > needed. To preview exactly what will be shipped without publishing, run
   > `npm publish --dry-run` (only `dist/`, `README.md`, and `LICENSE` are
   > included).

4. **Push the commit and tag** so GitHub matches npm:
   ```bash
   git push --follow-tags
   ```

5. **(Optional) Cut a GitHub release** for release notes:
   ```bash
   gh release create v0.1.1 --generate-notes
   ```

That's the whole flow: **change → `npm version` → `npm publish` → `git push --follow-tags`.**

## License

MIT License - see [LICENSE](LICENSE) file for details.
