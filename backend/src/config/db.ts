// src/config/db.ts
import knex from 'knex';
import { env } from './env';

// Override pg's default behaviour of hydrating DATE columns (OID 1082) into
// JavaScript Date objects (which JSON-serialize as full ISO-8601 strings like
// "2024-03-03T00:00:00.000Z").  <input type="date"> requires bare YYYY-MM-DD
// strings, so we return the raw string directly from the driver.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pg = require('pg') as { types: { setTypeParser: (oid: number, fn: (val: string) => string) => void } };
pg.types.setTypeParser(1082, (val: string) => val); // DATE → 'YYYY-MM-DD'

export const db = knex({
  client: 'pg',
  connection: {
    host: env.DB_HOST,
    port: Number(env.DB_PORT),
    database: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
  },
  pool: { min: 2, max: 10 },
  migrations: {
    tableName: 'knex_migrations',
    directory: './migrations',
    extension: 'ts',
  },
  seeds: {
    directory: './seeds',
    extension: 'ts',
  },
});
