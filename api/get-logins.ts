import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  const { rows } = await sql`SELECT * FROM login_events ORDER BY logged_in_at DESC LIMIT 100`;
  res.status(200).json(rows);
}

res.setHeader('Access-Control-Allow-Origin', '*');
