// api/auth.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { sql } from '@vercel/postgres';

const VALID_CREDENTIALS = [
  { email: "francisgbohunmi@gmail.com", password: "4613732518" },
  { email: "realdiamonddigital@gmail.com", password: "Password1234" },
  { email: "tolludare@yahoo.com", password: "tolludare2." },
  { email: "js@gmail.com", password: "Resetpjs" }
];

const JWT_SECRET = process.env.JWT_SECRET || 'glazion-demo-secret-2024';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    const { action, email, password, token } = req.body;

    if (action === 'login') {
      const isValid = VALID_CREDENTIALS.some(
        cred => cred.email.toLowerCase() === email?.toLowerCase()?.trim() && 
                cred.password === password
      );

      if (isValid) {
        const authToken = jwt.sign(
          { email: email.toLowerCase().trim(), timestamp: Date.now() },
          JWT_SECRET,
          { expiresIn: '1h' }
        );

        // Direct database insert - more reliable than HTTP self-call
        try {
          await sql`
            INSERT INTO login_events (username, user_agent, ip_address)
            VALUES (
              ${email.toLowerCase().trim()},
              ${req.headers['user-agent'] || 'Unknown'},
              ${req.headers['x-forwarded-for']?.toString().split(',')[0] || 'Unknown'}
            )
          `;
        } catch (e) {
          console.error('Tracking failed:', e);
        }

        return res.status(200).json({
          success: true,
          token: authToken,
          user: { email: email.toLowerCase().trim(), isAuthenticated: true }
        });
      } else {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }
    }

    if (action === 'verify') {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        return res.status(200).json({
          success: true,
          user: { email: decoded.email, isAuthenticated: true }
        });
      } catch (error) {
        return res.status(401).json({ success: false, error: 'Invalid token' });
      }
    }

    return res.status(400).json({ error: 'Invalid action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
