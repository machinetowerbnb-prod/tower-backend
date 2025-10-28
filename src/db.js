import pg from 'pg';
import 'dotenv/config';

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Neon/Supabase require SSL
});

export async function initDb() {
  await pool.query(`create extension if not exists "pgcrypto";`).catch(()=>{});
  await pool.query(`
    create table if not exists users (
      id uuid primary key default gen_random_uuid(),
      email text not null unique,
      password_hash text not null,
      created_at timestamptz not null default now()
    );
  `);
}