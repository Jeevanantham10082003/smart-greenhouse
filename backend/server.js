import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { Server as SocketIOServer } from 'socket.io';

import { ensureDatabase, db } from './src/db.js';
import sensorsRouter from './src/routes/sensors.js';
import actuatorsRouter, { actuatorBus } from './src/routes/actuators.js';
import plantsRouter from './src/routes/plants.js';
import devicesRouter from './src/routes/devices.js';
import rulesRouter, { startAutoControlEngine, stopAutoControlEngine } from './src/routes/rules.js';
import diseaseRouter from './src/routes/disease.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
	cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Security & middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '256kb' }));

const limiter = rateLimit({ windowMs: 60 * 1000, max: 300 });
app.use(limiter);

// Static frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// API routes
app.use('/api/sensors', sensorsRouter(io));
app.use('/api/actuators', actuatorsRouter(io));
app.use('/api/plants', plantsRouter);
app.use('/api/devices', devicesRouter);
app.use('/api/rules', rulesRouter(io));
app.use('/api/disease', diseaseRouter);

// Health
app.get('/api/health', (_req, res) => {
	res.json({ ok: true });
});

// WebSocket events
io.on('connection', (socket) => {
	// Send latest snapshot on connect
	db.get('SELECT * FROM snapshots ORDER BY createdAt DESC LIMIT 1', (err, row) => {
		if (!err && row) socket.emit('snapshot', row);
	});

	// Allow clients to request actuator toggle
	socket.on('actuator:toggle', (payload) => {
		actuatorBus.emit('toggle', payload);
	});
});

// Boot
const PORT = process.env.PORT || 3000;
await ensureDatabase();
startAutoControlEngine(io);

process.on('SIGINT', async () => {
	stopAutoControlEngine();
	server.close(() => process.exit(0));
});

server.listen(PORT, () => {
	console.log(`Smart Greenhouse server listening on http://localhost:${PORT}`);
});


