// generateToken.js
import 'dotenv/config'; // If using ESM; otherwise use require('dotenv').config();
import jwt from 'jsonwebtoken';

const payload = { id: 1, email: 'test@example.com' }; // replace as needed
const opts = { expiresIn: process.env.JWT_EXPIRES_IN || '1h' };

const token = jwt.sign(payload, process.env.JWT_SECRET, opts);
console.log('JWT token:', token);
