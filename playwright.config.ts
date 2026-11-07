import { defineConfig } from '@playwright/test'

// Drives the built app (out/, from npm run build:vite) through Playwright's
// Electron support. Every test starts its own app instance on a throwaway
// profile, see e2e/support/.
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // One app window at a time keeps keyboard focus and timing predictable.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: 'list'
})
