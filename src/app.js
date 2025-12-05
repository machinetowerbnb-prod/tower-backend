import express from 'express';
import cors from 'cors';
import userRoutes from './routes/userRoutes.js';

const app = express();

// CORS + Middlewares (same as before)
const raw = process.env.FRONTEND_URL || '';
const whitelist = raw.split(',').map(s => s.trim()).filter(Boolean);

whitelist.push('http://localhost:4200');

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (whitelist.length === 0 || whitelist.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api', userRoutes);

// ⭐⭐ THIS PART WAS MISSING ⭐⭐
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

export default app;
