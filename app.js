const cfg = {
	deviceIp: localStorage.getItem("deviceIp") || "127.0.0.1",
	devicePort: localStorage.getItem("devicePort") || "80",
	pollMs: Number(localStorage.getItem("pollMs") || 3000),
	get baseUrl() { return `http://${this.deviceIp}:${this.devicePort}`; },
	get wsUrl() { return `ws://${this.deviceIp}:${this.devicePort}/ws`; },
	endpoints: { sensors: "/api/sensors", relays: "/api/relays", setRelay: "/api/relay", setLcd: "/api/lcd" }
};

const el = {
	connStatus: document.getElementById("connStatus"),
	lastUpdate: document.getElementById("lastUpdate"),
	temp: document.getElementById("temp"),
	hum: document.getElementById("hum"),
	soil: document.getElementById("soil"),
	ldr: document.getElementById("ldr"),
	mq135: document.getElementById("mq135"),
	aqLabel: document.getElementById("aqLabel"),
	soilStatus: document.getElementById("soilStatus"),
	ldrStatus: document.getElementById("ldrStatus"),
	humBar: document.getElementById("humBar"),
	soilBar: document.getElementById("soilBar"),
	ldrBar: document.getElementById("ldrBar"),
	aqBar: document.getElementById("aqBar"),
	pumpBtn: document.getElementById("pumpBtn"),
	fanBtn: document.getElementById("fanBtn"),
	lightBtn: document.getElementById("lightBtn"),
	lcdForm: document.getElementById("lcdForm"),
	lcdText: document.getElementById("lcdText"),
	deviceIp: document.getElementById("deviceIp"),
	devicePort: document.getElementById("devicePort"),
	pollMs: document.getElementById("pollMs"),
	saveCfg: document.getElementById("saveCfg"),
	forceRefresh: document.getElementById("forceRefresh"),
};

let ws = null;
let pollTimer = null;

function setStatus(text, ok=false) {
	el.connStatus.textContent = text;
	el.connStatus.classList.toggle("connected", ok);
}
function setUpdatedNow() {
	const t = new Date();
	el.lastUpdate.textContent = `Last update: ${t.toLocaleTimeString()}`;
}
function clamp01(x){ return Math.max(0, Math.min(1, x)); }

function airQualityLabel(ppm) {
	if (ppm == null || isNaN(ppm)) return { label: "--", pct: 0, cls: "warn" };
	if (ppm < 100) return { label: "Excellent", pct: 0.15, cls: "good" };
	if (ppm < 200) return { label: "Good", pct: 0.30, cls: "good" };
	if (ppm < 400) return { label: "Moderate", pct: 0.55, cls: "warn" };
	if (ppm < 800) return { label: "Poor", pct: 0.80, cls: "bad" };
	return { label: "Very Poor", pct: 1.0, cls: "bad" };
}

function renderSensors(data) {
	if (typeof data.temp === "number") el.temp.textContent = data.temp.toFixed(1);
	if (typeof data.hum === "number") {
		el.hum.textContent = data.hum.toFixed(0);
		el.humBar.style.width = `${clamp01(data.hum/100)*100}%`;
		el.humBar.className = "bar-fill " + (data.hum > 70 ? "warn" : "good");
	}
	if (typeof data.soil === "number") {
		el.soil.textContent = data.soil.toFixed(0);
		el.soilBar.style.width = `${clamp01(data.soil/100)*100}%`;
		el.soilBar.className = "bar-fill " + (data.soil < 30 ? "bad" : data.soil < 50 || data.soil > 80 ? "warn" : "good");
		el.soilStatus.textContent = data.soil < 30 ? "⚠️ Too Dry" : data.soil < 50 ? "⚠️ Low Moisture" : data.soil > 80 ? "⚠️ Too Wet" : "✓ Optimal";
	}
	if (typeof data.ldr === "number") {
		el.ldr.textContent = data.ldr.toFixed(0);
		el.ldrBar.style.width = `${clamp01(data.ldr/100)*100}%`;
		el.ldrBar.className = "bar-fill " + (data.ldr < 20 ? "bad" : data.ldr < 40 ? "warn" : "good");
		el.ldrStatus.textContent = data.ldr < 20 ? "🌙 Very Dark" : data.ldr < 40 ? "🌆 Dim" : data.ldr > 80 ? "☀️ Very Bright" : "🌤️ Normal";
	}
	if (typeof data.mq135 === "number") {
		el.mq135.textContent = data.mq135.toFixed(0);
		const aq = airQualityLabel(data.mq135);
		el.aqLabel.textContent = aq.label;
		el.aqBar.style.width = `${aq.pct*100}%`;
		el.aqBar.className = `bar-fill ${aq.cls}`;
	}
	setUpdatedNow();
}

function setBtnState(btn, name, on) {
	btn.classList.toggle("on", on);
	btn.classList.toggle("off", !on);
	const icon = name === "pump" ? "💧" : name === "fan" ? "🌪️" : "💡";
	btn.textContent = `${icon} ${name[0].toUpperCase()+name.slice(1)}: ${on ? "ON" : "OFF"}`;
}
function renderRelays(data) {
	if ("pump" in data) setBtnState(el.pumpBtn, "pump", !!data.pump);
	if ("fan" in data) setBtnState(el.fanBtn, "fan", !!data.fan);
	if ("light" in data) setBtnState(el.lightBtn, "light", !!data.light);
	setUpdatedNow();
}

async function apiGet(path) {
	const res = await fetch(cfg.baseUrl + path, { cache: "no-store" });
	if (!res.ok) throw new Error(`GET ${path} ${res.status}`);
	return res.json();
}
async function apiPost(path, body) {
	const res = await fetch(cfg.baseUrl + path, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body)
	});
	if (!res.ok) throw new Error(`POST ${path} ${res.status}`);
	return res.json().catch(() => ({}));
}

async function refreshAll() {
	try {
		const [sensors, relays] = await Promise.all([
			apiGet(cfg.endpoints.sensors),
			apiGet(cfg.endpoints.relays)
		]);
		renderSensors(sensors);
		renderRelays(relays);
		setStatus("✓ Connected", true);
	} catch {
		setStatus("✗ Offline");
	}
}

function startPolling() {
	if (pollTimer) clearInterval(pollTimer);
	pollTimer = setInterval(refreshAll, cfg.pollMs);
	refreshAll();
	setStatus("Polling...");
}
function stopPolling() {
	if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

function connectWs() {
	try {
		ws = new WebSocket(cfg.wsUrl);
		ws.onopen = () => { setStatus("✓ Live (WebSocket)", true); stopPolling(); };
		ws.onmessage = (ev) => {
			try {
				const msg = JSON.parse(ev.data);
				if (msg.type === "sensors") renderSensors(msg.data || {});
				else if (msg.type === "relays") renderRelays(msg.data || {});
				else if (msg.type === "all") {
					if (msg.data?.sensors) renderSensors(msg.data.sensors);
					if (msg.data?.relays) renderRelays(msg.data.relays);
				}
			} catch {}
		};
		ws.onclose = () => { setStatus("Reconnecting..."); ws = null; startPolling(); setTimeout(connectWs, 5000); };
		ws.onerror = () => {};
	} catch {
		startPolling();
	}
}

async function toggleRelay(name, nextState) {
	try {
		await apiPost(cfg.endpoints.setRelay, { name, state: nextState });
		renderRelays({ [name]: nextState });
	} catch {}
}

el.pumpBtn.addEventListener("click", () => {
	const on = el.pumpBtn.classList.contains("on");
	toggleRelay("pump", !on);
});
el.fanBtn.addEventListener("click", () => {
	const on = el.fanBtn.classList.contains("on");
	toggleRelay("fan", !on);
});
el.lightBtn.addEventListener("click", () => {
	const on = el.lightBtn.classList.contains("on");
	toggleRelay("light", !on);
});

el.lcdForm.addEventListener("submit", async (e) => {
	e.preventDefault();
	const text = (el.lcdText.value || "").toString().slice(0, 32);
	if (!text) return;
	try { await apiPost(cfg.endpoints.setLcd, { text }); el.lcdText.value = ""; } catch {}
});

function loadSettings() {
	el.deviceIp.value = cfg.deviceIp;
	el.devicePort.value = cfg.devicePort;
	el.pollMs.value = cfg.pollMs;
}
el.saveCfg.addEventListener("click", () => {
	cfg.deviceIp = el.deviceIp.value.trim() || "127.0.0.1";
	cfg.devicePort = el.devicePort.value.trim() || "80";
	cfg.pollMs = Math.max(1000, Number(el.pollMs.value) || 3000);
	localStorage.setItem("deviceIp", cfg.deviceIp);
	localStorage.setItem("devicePort", cfg.devicePort);
	localStorage.setItem("pollMs", String(cfg.pollMs));
	stopPolling();
	connectWs();
});
el.forceRefresh.addEventListener("click", refreshAll);

loadSettings();
connectWs();
startPolling();