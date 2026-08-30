import 'dotenv/config';
import { defineConfig } from 'prisma/config';
import { resolveDatabaseUrl } from './src/prisma/database-url';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node prisma/seed.ts',
  },
  datasource: {
    url: resolveDatabaseUrl(),
  },
});
