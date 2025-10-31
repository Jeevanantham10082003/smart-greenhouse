import express from 'express';
import { all, get, run } from '../db.js';

const router = express.Router();

router.get('/', async (_req, res) => {
	res.json(await all(`SELECT * FROM plants`));
});

router.post('/', async (req, res) => {
	const { name, idealTempMin, idealTempMax, idealHumidityMin, idealHumidityMax, idealSoilMoistureMin, idealSoilMoistureMax } = req.body || {};
	if (!name) return res.status(400).json({ error: 'name required' });
	await run(`INSERT INTO plants(name, idealTempMin, idealTempMax, idealHumidityMin, idealHumidityMax, idealSoilMoistureMin, idealSoilMoistureMax) VALUES(?,?,?,?,?,?,?)`, [
		name, idealTempMin ?? null, idealTempMax ?? null, idealHumidityMin ?? null, idealHumidityMax ?? null, idealSoilMoistureMin ?? null, idealSoilMoistureMax ?? null
	]);
	res.json(await get(`SELECT * FROM plants ORDER BY id DESC LIMIT 1`));
});

router.put('/:id', async (req, res) => {
	const id = Number(req.params.id);
	const existing = await get(`SELECT * FROM plants WHERE id=?`, [id]);
	if (!existing) return res.status(404).json({ error: 'Not found' });
	const { name, idealTempMin, idealTempMax, idealHumidityMin, idealHumidityMax, idealSoilMoistureMin, idealSoilMoistureMax } = req.body || {};
	await run(`UPDATE plants SET name=?, idealTempMin=?, idealTempMax=?, idealHumidityMin=?, idealHumidityMax=?, idealSoilMoistureMin=?, idealSoilMoistureMax=? WHERE id=?`, [
		name ?? existing.name,
		idealTempMin ?? existing.idealTempMin,
		idealTempMax ?? existing.idealTempMax,
		idealHumidityMin ?? existing.idealHumidityMin,
		idealHumidityMax ?? existing.idealHumidityMax,
		idealSoilMoistureMin ?? existing.idealSoilMoistureMin,
		idealSoilMoistureMax ?? existing.idealSoilMoistureMax,
		id
	]);
	res.json(await get(`SELECT * FROM plants WHERE id=?`, [id]));
});

router.delete('/:id', async (req, res) => {
	await run(`DELETE FROM plants WHERE id=?`, [Number(req.params.id)]);
	res.json({ ok: true });
});

export default router;


