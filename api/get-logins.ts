import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    try {
      const result = await sql`
        SELECT id, username, user_agent, ip_address, logged_in_at, city, country, region
        FROM login_events
        ORDER BY logged_in_at DESC
      `;
      return res.status(200).json(result.rows);
    } catch (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to fetch login events' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
