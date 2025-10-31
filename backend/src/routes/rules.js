import express from 'express';
import dayjs from 'dayjs';
import { all, get, run } from '../db.js';
import { actuatorBus } from './actuators.js';

let engineInterval = null;

export function startAutoControlEngine(io) {
	if (engineInterval) return;
	engineInterval = setInterval(async () => {
		const latest = await get(`SELECT * FROM snapshots ORDER BY createdAt DESC LIMIT 1`);
		if (!latest) return;
		const rules = await all(`SELECT * FROM rules WHERE enabled=1`);
		for (const rule of rules) {
			const metric = pickMetric(rule.type, latest);
			if (metric == null) continue;
			let shouldActivate = false;
			if (rule.thresholdLow != null && metric < rule.thresholdLow) shouldActivate = true;
			if (rule.thresholdHigh != null && metric > rule.thresholdHigh) shouldActivate = true;
			const device = await get(`SELECT * FROM devices WHERE id=?`, [rule.actuatorId]);
			if (!device) continue;
			if (shouldActivate && device.isActive === 0) {
				await run(`UPDATE devices SET isActive=1 WHERE id=?`, [device.id]);
				const updated = await get(`SELECT * FROM devices WHERE id=?`, [device.id]);
				io.emit('device:update', updated);
				actuatorBus.emit('toggle', { id: device.id, isActive: 1, reason: 'auto' });
			}
			if (!shouldActivate && device.isActive === 1) {
				await run(`UPDATE devices SET isActive=0 WHERE id=?`, [device.id]);
				const updated = await get(`SELECT * FROM devices WHERE id=?`, [device.id]);
				io.emit('device:update', updated);
				actuatorBus.emit('toggle', { id: device.id, isActive: 0, reason: 'auto' });
			}
		}
	}, 3000);
}

export function stopAutoControlEngine() {
	if (engineInterval) clearInterval(engineInterval);
	engineInterval = null;
}

function pickMetric(type, snapshot) {
	switch (type) {
		case 'temperature': return snapshot.temperature;
		case 'humidity': return snapshot.humidity;
		case 'soilMoisture': return snapshot.soilMoisture;
		case 'airQuality': return snapshot.airQuality;
		case 'light': return snapshot.lightLevel;
		default: return null;
	}
}

export default function rulesRouter(io) {
	const router = express.Router();

	router.get('/', async (_req, res) => {
		res.json(await all(`SELECT * FROM rules`));
	});

	router.post('/', async (req, res) => {
		const { name, type, thresholdLow, thresholdHigh, actuatorId, enabled } = req.body || {};
		if (!name || !type || !actuatorId) return res.status(400).json({ error: 'name, type, actuatorId required' });
		await run(`INSERT INTO rules(name, type, thresholdLow, thresholdHigh, actuatorId, enabled) VALUES(?,?,?,?,?,?)`, [
			name, type, thresholdLow ?? null, thresholdHigh ?? null, actuatorId, enabled ? 1 : 1
		]);
		res.json(await get(`SELECT * FROM rules ORDER BY id DESC LIMIT 1`));
	});

	router.put('/:id', async (req, res) => {
		const id = Number(req.params.id);
		const existing = await get(`SELECT * FROM rules WHERE id=?`, [id]);
		if (!existing) return res.status(404).json({ error: 'Not found' });
		const { name, type, thresholdLow, thresholdHigh, actuatorId, enabled } = req.body || {};
		await run(`UPDATE rules SET name=?, type=?, thresholdLow=?, thresholdHigh=?, actuatorId=?, enabled=? WHERE id=?`, [
			name ?? existing.name,
			type ?? existing.type,
			thresholdLow ?? existing.thresholdLow,
			thresholdHigh ?? existing.thresholdHigh,
			actuatorId ?? existing.actuatorId,
			enabled != null ? (enabled ? 1 : 0) : existing.enabled,
			id
		]);
		res.json(await get(`SELECT * FROM rules WHERE id=?`, [id]));
	});

	router.delete('/:id', async (req, res) => {
		await run(`DELETE FROM rules WHERE id=?`, [Number(req.params.id)]);
		res.json({ ok: true });
	});

	return router;
}


