import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { protect } from '../middleware/auth';

const router = express.Router();

const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'saheli_secret_key_123', {
    expiresIn: '30d',
  });
};

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, phone, password, role, shgId } = req.body;

    const userExists = await User.findOne({ phone });
    if (userExists) {
      return res.status(400).json({ success: false, error: 'User already exists with this phone number' });
    }

    const user = await User.create({
      name,
      phone,
      password,
      role: role || 'member',
      shgId
    });

    if (user) {
      res.status(201).json({
        success: true,
        data: {
          _id: user._id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          shgId: user.shgId,
          token: generateToken(user._id as unknown as string),
        }
      });
    } else {
      res.status(400).json({ success: false, error: 'Invalid user data format' });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { phone, password } = req.body;
    const user = await User.findOne({ phone });

    if (user && (await (user as any).matchPassword(password))) {
      res.json({
        success: true,
        data: {
          _id: user._id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          shgId: user.shgId,
          token: generateToken(user._id as unknown as string),
        }
      });
    } else {
      res.status(401).json({ success: false, error: 'Invalid phone number or password' });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/profile', protect, async (req: any, res: Response) => {
  const user = await User.findById(req.user._id).select('-password');
  if (user) {
    res.json({ success: true, data: user });
  } else {
    res.status(404).json({ success: false, error: 'User not found' });
  }
});

// ─── Demo Seed (Hackathon only — creates 3 demo users) ─────────────────────
router.post('/seed-demo', async (_req: Request, res: Response) => {
  try {
    const demoUsers = [
      { name: 'Lakshmi Devi', phone: '+91-9876543210', password: 'demo1234', role: 'member', shgId: 'shg1' },
      { name: 'Leader Priya', phone: '+91-9000000001', password: 'demo1234', role: 'leader', shgId: 'shg1' },
      { name: 'Bank Manager',  phone: '+91-9000000002', password: 'demo1234', role: 'bank' },
    ];
    const results = [];
    for (const u of demoUsers) {
      const exists = await User.findOne({ phone: u.phone });
      if (!exists) {
        const created = await User.create(u);
        results.push({ created: true, phone: created.phone, role: created.role });
      } else {
        results.push({ created: false, phone: u.phone, role: u.role, note: 'already exists' });
      }
    }
    res.json({ success: true, data: results });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
