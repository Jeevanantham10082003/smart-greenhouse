import express from 'express';
import { EventEmitter } from 'events';
import { all, get, run } from '../db.js';

export const actuatorBus = new EventEmitter();

export default function actuatorsRouter(io) {
	const router = express.Router();

	router.get('/', async (_req, res) => {
		const devices = await all(`SELECT * FROM devices`);
		return res.json(devices);
	});

	router.post('/:id/toggle', async (req, res) => {
		const id = Number(req.params.id);
		const device = await get(`SELECT * FROM devices WHERE id=?`, [id]);
		if (!device) return res.status(404).json({ error: 'Not found' });
		const newState = device.isActive ? 0 : 1;
		await run(`UPDATE devices SET isActive=? WHERE id=?`, [newState, id]);
		const updated = await get(`SELECT * FROM devices WHERE id=?`, [id]);
		io.emit('device:update', updated);
		actuatorBus.emit('toggle', { id, isActive: newState });
		return res.json(updated);
	});

	router.post('/:id/state', async (req, res) => {
		const id = Number(req.params.id);
		const { isActive } = req.body || {};
		if (typeof isActive !== 'number') return res.status(400).json({ error: 'isActive (0|1) required' });
		await run(`UPDATE devices SET isActive=? WHERE id=?`, [isActive, id]);
		const updated = await get(`SELECT * FROM devices WHERE id=?`, [id]);
		io.emit('device:update', updated);
		actuatorBus.emit('toggle', { id, isActive });
		return res.json(updated);
	});

	return router;
}


