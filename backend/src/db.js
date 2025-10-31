import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../data/greenhouse.db');
sqlite3.verbose();
export const db = new sqlite3.Database(dbPath);

export async function ensureDatabase() {
	await run(`PRAGMA journal_mode=WAL;`);

	await run(`CREATE TABLE IF NOT EXISTS sensors (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		key TEXT NOT NULL UNIQUE
	);`);

	await run(`CREATE TABLE IF NOT EXISTS devices (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		type TEXT NOT NULL,
		pin INTEGER,
		isActive INTEGER DEFAULT 0
	);`);

	await run(`CREATE TABLE IF NOT EXISTS readings (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		sensorKey TEXT NOT NULL,
		value REAL NOT NULL,
		createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
	);`);

	await run(`CREATE TABLE IF NOT EXISTS snapshots (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		temperature REAL,
		humidity REAL,
		soilMoisture REAL,
		airQuality REAL,
		lightLevel REAL,
		createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
	);`);

	await run(`CREATE TABLE IF NOT EXISTS rules (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		type TEXT NOT NULL,
		thresholdLow REAL,
		thresholdHigh REAL,
		actuatorId INTEGER,
		enabled INTEGER DEFAULT 1
	);`);

	await run(`CREATE TABLE IF NOT EXISTS plants (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		idealTempMin REAL,
		idealTempMax REAL,
		idealHumidityMin REAL,
		idealHumidityMax REAL,
		idealSoilMoistureMin REAL,
		idealSoilMoistureMax REAL
	);`);

	// Seed default devices if none
	const count = await get(`SELECT COUNT(*) as c FROM devices`);
	if (count.c === 0) {
		await run(`INSERT INTO devices(name, type, pin, isActive) VALUES
			('Water Pump', 'pump', 5, 0),
			('Ventilation Fan', 'fan', 4, 0),
			('Grow Light', 'light', 14, 0)
		`);
	}
}

export function run(sql, params = []) {
	return new Promise((resolve, reject) => {
		db.run(sql, params, function (err) {
			if (err) return reject(err);
			resolve(this);
		});
	});
}

export function all(sql, params = []) {
	return new Promise((resolve, reject) => {
		db.all(sql, params, (err, rows) => {
			if (err) return reject(err);
			resolve(rows);
		});
	});
}

export function get(sql, params = []) {
	return new Promise((resolve, reject) => {
		db.get(sql, params, (err, row) => {
			if (err) return reject(err);
			resolve(row);
		});
	});
}


