import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { randomPassword } from '../utils/rand.js';
import { sendMail } from '../utils/email.js';

const router = Router();

/**
 * POST /api/auth/signup
 * body: { email }
 */
router.post(
  '/signup',
  [ body('email').isEmail().withMessage('Invalid email').normalizeEmail() ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const { email } = req.body;

    try {
      const { rows: exist } = await pool.query('select 1 from users where email=$1', [email]);
      if (exist.length) return res.status(409).json({ message: 'Email already registered' });

      const plain = randomPassword(8);                  // random 8-char
      const hash = await bcrypt.hash(plain, 12);        // store only hash

      await pool.query('insert into users (email, password_hash) values ($1,$2)', [email, hash]);

      // Send credentials mail (non-blocking)
      try {
        await sendMail({
          to: email,
          subject: 'Your account credentials',
          html: `<p>Welcome!</p>
                 <p><b>Username:</b> ${email}</p>
                 <p><b>Password:</b> ${plain}</p>
                 <p>Please change your password after first login.</p>`
        });
      } catch (e) {
        console.error('Email send failed:', e.message);
        // we still return success; you can inform FE to show "email failed" if needed
      }

      return res.status(201).json({ message: 'Signup successful. Check your email for credentials.' });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: 'Server error' });
    }
  }
);

export default router;
