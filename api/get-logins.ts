import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    const { rows } =
      await sql`SELECT * FROM login_events ORDER BY logged_in_at DESC LIMIT 100`;

    return res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch logins' });
  }
}
