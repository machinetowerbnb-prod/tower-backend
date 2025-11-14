import express from 'express';
import cors from 'cors';
import userRoutes from './routes/userRoutes.js';
const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL?.split(',') ?? '*',
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"]
}));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api', userRoutes);

export default app;
