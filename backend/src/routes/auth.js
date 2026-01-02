import express from 'express';
import bcrypt from 'bcryptjs';
import { signToken, requireAuth } from '../middleware/authJwt.js';
import { getUserByEmail, createUser, linkCustomerToUser, getCustomerByUserId, getUserById } from '../db/queries.js';

const router = express.Router();

router.post('/signup', async (req, res, next) => {
  try {
    const { email, password, name } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing required fields: email, password' });
    }
    const existing = await getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already in use' });
    }
    const passwordHash = await bcrypt.hash(String(password), 10);
    const user = await createUser({ email, passwordHash, name: name || null });
    await linkCustomerToUser(user.id, email, name || null);
    const token = signToken({ id: user.id, email: user.email });
    return res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name || null } });
  } catch (err) { next(err); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing required fields: email, password' });
    }
    const user = await getUserByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(String(password), user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = signToken({ id: user.id, email: user.email });
    return res.json({ token, user: { id: user.id, email: user.email, name: user.name || null } });
  } catch (err) { next(err); }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await getUserById(req.user.id);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const customer = await getCustomerByUserId(user.id);
    return res.json({ user: { id: user.id, email: user.email, name: user.name || null }, customer });
  } catch (err) { next(err); }
});

export default router;
