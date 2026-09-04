import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { TEST_DATABASE_URL } from './setup-env';

export default async function globalSetup(): Promise<void> {
  process.env.DATABASE_URL = TEST_DATABASE_URL;

  const file = TEST_DATABASE_URL.replace(/^file:/, '');
  for (const suffix of ['', '-journal', '-shm', '-wal']) {
    fs.rmSync(path.resolve(`${file}${suffix}`), { force: true });
  }

  execFileSync('npx', ['prisma', 'db', 'push'], {
    stdio: 'inherit',
    env: process.env,
    shell: true,
  });

  const { seed } = await import('../prisma/seed');
  await seed();
}
