import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => {
  const dir = import.meta.dirname

  // Demo build: standalone marketing/dev site. Output to a non-published dir so
  // demo HTML/assets never end up in the npm tarball (`files` allowlists `dist`).
  if (mode === 'demo') {
    return {
      build: {
        target: 'es2023',
        outDir: 'demo-dist',
        emptyOutDir: true,
        rollupOptions: {
          input: {
            index: resolve(dir, 'index.html'),
            uploader: resolve(dir, 'uploader.html'),
            waveform: resolve(dir, 'waveform.html'),
          }
        }
      }
    }
  }

  // Library build: a single code-split ES build with one entry per public
  // component. Rollup hoists shared modules (lit, src/lib, src/components, and
  // the waveform) into shared chunks instead of inlining/duplicating them into
  // every entry, so consumers who import only one subpath tree-shake the rest.
  return {
    build: {
      target: 'es2023',
      outDir: 'dist',
      emptyOutDir: true,
      lib: {
        entry: {
          index: resolve(dir, 'src', 'index.ts'),
          player: resolve(dir, 'src', 'player.ts'),
          uploader: resolve(dir, 'src', 'uploader.ts'),
          waveform: resolve(dir, 'src', 'waveform.ts'),
        },
        // ES only: required for code splitting and CDN `type="module"` usage.
        formats: ['es'],
      },
      rollupOptions: {
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: 'shared/[name]-[hash].js',
          // Keep lit isolated in its own shared chunk (bundled, deduped).
          manualChunks: (id) =>
            id.includes('node_modules/lit') || id.includes('node_modules/@lit')
              ? 'lit'
              : undefined,
        },
      },
    }
  }
})
