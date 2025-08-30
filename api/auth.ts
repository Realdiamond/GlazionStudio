// api/auth.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

// Credentials stored ONLY on server - never sent to browser
const VALID_CREDENTIALS = [
  { email: "francisgbohunmi@gmail.com", password: "4613732518" },
  { email: "realdiamonddigital@gmail.com", password: "Password1234" },
  { email: "tolludare@yahoo.com", password: "tolludare2." }
];

const JWT_SECRET = process.env.JWT_SECRET || 'glazion-demo-secret-2024';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS for your frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    const { action, email, password, token } = req.body;

    if (action === 'login') {
      // Validate credentials (server-side only)
      const isValid = VALID_CREDENTIALS.some(
        cred => cred.email.toLowerCase() === email?.toLowerCase()?.trim() && 
                cred.password === password
      );

      if (isValid) {
        // Create JWT token (expires in 1 hour)
        const authToken = jwt.sign(
          { email: email.toLowerCase().trim(), timestamp: Date.now() },
          JWT_SECRET,
          { expiresIn: '1h' }
        );

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