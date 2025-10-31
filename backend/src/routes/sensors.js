import express from 'express';
import { run, get } from '../db.js';

export default function sensorsRouter(io) {
	const router = express.Router();

	// ESP8266 posts current readings
	router.post('/ingest', async (req, res) => {
		try {
			const { temperature, humidity, soilMoisture, airQuality, lightLevel } = req.body || {};
			if ([temperature, humidity, soilMoisture, airQuality, lightLevel].every(v => v === undefined)) {
				return res.status(400).json({ error: 'Missing readings' });
			}
			await run(`INSERT INTO snapshots(temperature, humidity, soilMoisture, airQuality, lightLevel) VALUES(?,?,?,?,?)`, [
				temperature ?? null,
				humidity ?? null,
				soilMoisture ?? null,
				airQuality ?? null,
				lightLevel ?? null
			]);
			const snapshot = await get(`SELECT * FROM snapshots ORDER BY createdAt DESC LIMIT 1`);
			io.emit('snapshot', snapshot);
			return res.json({ ok: true });
		} catch (e) {
			return res.status(500).json({ error: e.message });
		}
	});

	// Last snapshot
	router.get('/latest', async (_req, res) => {
		const row = await get(`SELECT * FROM snapshots ORDER BY createdAt DESC LIMIT 1`);
		return res.json(row || {});
	});

	return router;
}


