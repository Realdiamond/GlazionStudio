import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const { username, userAgent, ip } = req.body;
  
  await sql`
    INSERT INTO login_events (username, user_agent, ip_address, logged_in_at)
    VALUES (${username}, ${userAgent}, ${ip}, NOW())
  `;
  
  res.status(200).json({ success: true });
}
