import express from 'express';
import cors from 'cors';
import userRoutes from './routes/userRoutes.js';

const app = express();

// Read env and build whitelist array
const raw = process.env.FRONTEND_URL || '';
const whitelist = raw.split(',')
  .map(s => s.trim())
  .filter(Boolean); // e.g. ["https://myvercel.app","https://staging.myapp.com"]

// CORS options with dynamic origin check
const corsOptions = {
  origin: function(origin, callback) {
    // Allow non-browser requests like curl or server-to-server where origin is undefined
    if (!origin) return callback(null, true);

    if (whitelist.length === 0) {
      // If no whitelist provided, you can allow everything (not recommended for prod)
      return callback(null, true);
    }

    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Length', 'X-Kuma-Revision'], // if you need to expose specific headers
  credentials: true, // set to true if you use cookies/auth headers and want to allow them
  optionsSuccessStatus: 204
};

// Apply CORS globally
app.use(cors(corsOptions));

// Make sure preflight (OPTIONS) requests are handled
app.options('*', cors(corsOptions));

app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api', userRoutes);

export default app;