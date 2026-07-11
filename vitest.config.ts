import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // Scope coverage to the shipped library source only. Build output
      // (dist/, demo-dist/), dev/demo entrypoints, the barrel, and pure-style
      // modules are excluded so the numbers reflect real component logic.
      include: ['src/**/*.ts'],
      exclude: [
        'src/index.ts',
        'src/dev.ts',
        'src/dev-waveform.ts',
        'src/global-css.ts',
        '**/*.d.ts'
      ]
    }
  }
})
