// `pnpm demo`: starts the mock Supabase server and the Next dev server together.
import { spawn } from 'node:child_process'

const PORT = process.env.MOCK_PORT || '54321'
const env = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: `http://localhost:${PORT}`,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'demo',
}
const run = (cmd, args, extra = {}) => spawn(cmd, args, { stdio: 'inherit', env: { ...env, ...extra }, shell: process.platform === 'win32' })
const children = [run('node', ['scripts/demo/mock-supabase.mjs'], { PORT }), run('pnpm', ['dev'])]
const stop = () => children.forEach((c) => c.kill())
children.forEach((c) => c.on('exit', stop))
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
