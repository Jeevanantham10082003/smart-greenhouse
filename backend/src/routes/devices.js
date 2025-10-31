import express from 'express';
import { all, get, run } from '../db.js';

const router = express.Router();

router.get('/', async (_req, res) => {
	res.json(await all(`SELECT * FROM devices`));
});

router.post('/', async (req, res) => {
	const { name, type, pin } = req.body || {};
	if (!name || !type) return res.status(400).json({ error: 'name and type required' });
	await run(`INSERT INTO devices(name, type, pin, isActive) VALUES(?,?,?,0)`, [name, type, pin ?? null]);
	res.json(await get(`SELECT * FROM devices ORDER BY id DESC LIMIT 1`));
});

router.put('/:id', async (req, res) => {
	const id = Number(req.params.id);
	const existing = await get(`SELECT * FROM devices WHERE id=?`, [id]);
	if (!existing) return res.status(404).json({ error: 'Not found' });
	const { name, type, pin, isActive } = req.body || {};
	await run(`UPDATE devices SET name=?, type=?, pin=?, isActive=? WHERE id=?`, [
		name ?? existing.name,
		type ?? existing.type,
		pin ?? existing.pin,
		isActive != null ? isActive : existing.isActive,
		id
	]);
	res.json(await get(`SELECT * FROM devices WHERE id=?`, [id]));
});

router.delete('/:id', async (req, res) => {
	await run(`DELETE FROM devices WHERE id=?`, [Number(req.params.id)]);
	res.json({ ok: true });
});

export default router;


