import express from 'express';
import cors from 'cors';
import userRoutes from './routes/userRoutes.js';

const app = express();

/* --------------------------
   Build whitelist from env
---------------------------*/

const raw = process.env.FRONTEND_URL || '';
const whitelist = raw
  .split(',')
  .map(s => s.trim())
  .filter(Boolean); 

/* --------------------------
   CORS Options (Perfect)
---------------------------*/

const corsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server or curl (no origin)
    if (!origin) return callback(null, true);

    // If whitelist is empty → deny unknown origins
    if (whitelist.length === 0) {
      return callback(null, true); // allow all (or make it false)
    }

    // Check if origin allowed
    if (whitelist.includes(origin)) {
      callback(null, true);
    } else {
      console.log('❌ Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },

  credentials: true, // needed for cookies or auth headers
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204
};

/* --------------------------
   Apply CORS
---------------------------*/

app.use(cors(corsOptions));

// Preflight handler (Express v5 safe)
app.options('/(.*)', cors(corsOptions));

/* --------------------------
   Middlewares
---------------------------*/

app.use(express.json());

/* --------------------------
   Routes
---------------------------*/

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api', userRoutes);

/* --------------------------
   Export app
---------------------------*/

export default app;