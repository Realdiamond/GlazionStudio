import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sign, verify } from 'jsonwebtoken';

const VALID_CREDENTIALS = [
  { email: "francisgbohunmi@gmail.com", password: "4613732518" },
  { email: "realdiamonddigital@gmail.com", password: "Password1234" },
  { email: "tolludare@yahoo.com", password: "tolludare2." }
];

const JWT_SECRET = process.env.JWT_SECRET || 'glazion-demo-secret-2024';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    const { action, email, password, token } = req.body;
    console.log('Received POST request with action:', action);

    if (action === 'login') {
      console.log('Checking credentials for:', email);

      const isValid = VALID_CREDENTIALS.some(
        cred => cred.email.toLowerCase() === email?.toLowerCase()?.trim() && cred.password === password
      );
      
      if (isValid) {
        try {
          const authToken = sign(
            { email: email.toLowerCase().trim(), timestamp: Date.now() },
            JWT_SECRET,
            { expiresIn: '1h' }
          );
          console.log('JWT token created for:', email);
          
          return res.status(200).json({
            success: true,
            token: authToken,
            user: { email: email.toLowerCase().trim(), isAuthenticated: true }
          });
        } catch (error) {
          console.error('Error creating JWT token:', error);
          return res.status(500).json({ success: false, error: 'Error creating token' });
        }
      } else {
        console.log('Invalid credentials:', email);
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }
    }

    if (action === 'verify') {
      console.log('Verifying token:', token);

      try {
        const decoded = verify(token, JWT_SECRET) as any;
        console.log('Token verified, decoded:', decoded);
        return res.status(200).json({
          success: true,
          user: { email: decoded.email, isAuthenticated: true }
        });
      } catch (error) {
        console.error('Error verifying token:', error);
        return res.status(401).json({ success: false, error: 'Invalid token' });
      }
    }

    console.log('Invalid action:', action);
    return res.status(400).json({ error: 'Invalid action' });
  }

  console.log('Method not allowed:', req.method);
  return res.status(405).json({ error: 'Method not allowed' });
}
