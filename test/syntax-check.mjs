import { execSync } from 'node:child_process'

try {
  const output = execSync('npm run lint', {
    encoding: 'utf-8',
    stdio: 'pipe',
    shell: true,
  })
  console.log('Syntax check passed cleanly')
  if (output.trim()) {
    console.log(output.trim())
  }
  process.exit(0)
} catch (err) {
  const stdout = err.stdout?.toString() || ''
  const stderr = err.stderr?.toString() || ''
  console.error('Syntax check failed:')
  if (stdout) console.error(stdout)
  if (stderr) console.error(stderr)
  process.exit(err.status || 1)
}

