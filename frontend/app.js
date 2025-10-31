const BASE_URL = (window.BACKEND_URL || '').replace(/\/$/, '');
const socket = BASE_URL ? io(BASE_URL) : io();

const tempEl = document.getElementById('temp');
const humEl = document.getElementById('hum');
const soilEl = document.getElementById('soil');
const airEl = document.getElementById('air');
const lightEl = document.getElementById('light');

const devicesList = document.getElementById('devices-list');
const rulesList = document.getElementById('rules-list');
const plantsList = document.getElementById('plants-list');
const actuatorSelect = document.getElementById('actuatorSelect');

function setMetric(el, v){ el.textContent = v == null ? '--' : Number(v).toFixed(1); }

async function fetchJSON(url, opts){
    const full = BASE_URL ? BASE_URL + url : url;
    const res = await fetch(full, opts);
	if (!res.ok) throw new Error(await res.text());
	return res.json();
}

function renderDevices(devices){
	devicesList.innerHTML = '';
	actuatorSelect.innerHTML = '';
	for (const d of devices){
		const row = document.createElement('div');
		row.className = 'row';
		row.innerHTML = `<div class="grow"><strong>${d.name}</strong> <small style="color:#7b88a8">(${d.type})</small></div>`;
		const btn = document.createElement('button');
		btn.className = 'btn ' + (d.isActive ? '' : 'outline');
		btn.textContent = d.isActive ? 'ON' : 'OFF';
		btn.onclick = async () => {
			const updated = await fetchJSON(`/api/actuators/${d.id}/toggle`, { method:'POST', headers:{'Content-Type':'application/json'} });
			btn.textContent = updated.isActive ? 'ON' : 'OFF';
			btn.className = 'btn ' + (updated.isActive ? '' : 'outline');
		};
		row.appendChild(btn);
		devicesList.appendChild(row);

		const opt = document.createElement('option');
		opt.value = d.id; opt.textContent = d.name;
		actuatorSelect.appendChild(opt);
	}
}

function renderRules(rules){
	rulesList.innerHTML='';
	for(const r of rules){
		const row = document.createElement('div');
		row.className='row';
		row.innerHTML = `<div class="grow"><strong>${r.name}</strong> <small style="color:#7b88a8">${r.type} L:${r.thresholdLow ?? '-'} H:${r.thresholdHigh ?? '-'}</small></div>`;
		const del = document.createElement('button');
		del.className='btn outline'; del.textContent='Delete';
		del.onclick = async ()=>{ await fetchJSON(`/api/rules/${r.id}`, { method:'DELETE' }); load(); };
		row.appendChild(del);
		rulesList.appendChild(row);
	}
}

function renderPlants(plants){
	plantsList.innerHTML='';
	for(const p of plants){
		const row = document.createElement('div');
		row.className='row';
		row.innerHTML = `<div class="grow"><strong>${p.name}</strong> <small style="color:#7b88a8">T:${p.idealTempMin ?? '-'}-${p.idealTempMax ?? '-'} H:${p.idealHumidityMin ?? '-'}-${p.idealHumidityMax ?? '-'} S:${p.idealSoilMoistureMin ?? '-'}-${p.idealSoilMoistureMax ?? '-'}</small></div>`;
		const del = document.createElement('button');
		del.className='btn outline'; del.textContent='Delete';
		del.onclick = async ()=>{ await fetchJSON(`/api/plants/${p.id}`, { method:'DELETE' }); load(); };
		row.appendChild(del);
		plantsList.appendChild(row);
	}
}

document.getElementById('rule-form').onsubmit = async (e)=>{
	e.preventDefault();
	const fd = new FormData(e.target);
	const body = Object.fromEntries(fd.entries());
	body.thresholdLow = body.thresholdLow ? Number(body.thresholdLow) : null;
	body.thresholdHigh = body.thresholdHigh ? Number(body.thresholdHigh) : null;
	body.actuatorId = Number(body.actuatorId);
	await fetchJSON('/api/rules', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
	e.target.reset();
	load();
};

document.getElementById('plant-form').onsubmit = async (e)=>{
	e.preventDefault();
	const fd = new FormData(e.target);
	const body = Object.fromEntries(fd.entries());
	for (const k of Object.keys(body)) if (k !== 'name' && body[k] !== '') body[k] = Number(body[k]);
	await fetchJSON('/api/plants', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
	e.target.reset();
	load();
};

socket.on('snapshot', s=>{
	setMetric(tempEl, s.temperature);
	setMetric(humEl, s.humidity);
	setMetric(soilEl, s.soilMoisture);
	airEl.textContent = s.airQuality ?? '--';
	lightEl.textContent = s.lightLevel ?? '--';
});

socket.on('device:update', ()=> loadDevices());

async function loadDevices(){
	const devices = await fetchJSON('/api/actuators');
	renderDevices(devices);
}

async function load(){
	const [snapshot, devices, rules, plants] = await Promise.all([
		fetchJSON('/api/sensors/latest'),
		fetchJSON('/api/actuators'),
		fetchJSON('/api/rules'),
		fetchJSON('/api/plants')
	]);
	if (snapshot){
		setMetric(tempEl, snapshot.temperature);
		setMetric(humEl, snapshot.humidity);
		setMetric(soilEl, snapshot.soilMoisture);
		airEl.textContent = snapshot.airQuality ?? '--';
		lightEl.textContent = snapshot.lightLevel ?? '--';
	}
	renderDevices(devices);
	renderRules(rules);
	renderPlants(plants);
}

// Simple nav highlighting
const navLinks = document.querySelectorAll('nav a');
navLinks.forEach(a=>{
	a.addEventListener('click', ()=>{
		navLinks.forEach(x=>x.classList.remove('active'));
		a.classList.add('active');
	});
});

load();


