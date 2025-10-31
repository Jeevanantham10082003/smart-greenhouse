# Smart Greenhouse Monitoring & Climate Control

Responsive web app to monitor sensors (DHT11, Soil Moisture, MQ135, LDR) and control actuators (water pump, ventilation fan, grow light) via ESP8266. Supports manual toggles, auto rules, real-time updates, and CRUD for plants/devices. Includes a stub endpoint for future plant disease detection.

## Quick Start
```
npm install
npm run dev
# Open http://localhost:3000
```

## API Highlights
- POST /api/sensors/ingest { temperature, humidity, soilMoisture, airQuality, lightLevel }
- GET  /api/actuators
- POST /api/actuators/:id/toggle
- CRUD /api/devices, /api/plants, /api/rules
- POST /api/disease/analyze (stub)

## ESP8266 Example (Arduino)
```cpp
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "YOUR_WIFI";
const char* pass = "YOUR_PASS";
const char* server = "http://YOUR_PC_IP:3000/api/sensors/ingest";

void setup(){ WiFi.begin(ssid, pass); while (WiFi.status() != WL_CONNECTED) delay(500); }

void loop(){
  if (WiFi.status() == WL_CONNECTED){
    HTTPClient http; WiFiClient client;
    http.begin(client, server);
    http.addHeader("Content-Type", "application/json");
    StaticJsonDocument<256> doc;
    doc["temperature"] = 26.5;
    doc["humidity"] = 55.2;
    doc["soilMoisture"] = 41.0;
    doc["airQuality"] = 150;
    doc["lightLevel"] = 720;
    String body; serializeJson(doc, body);
    http.POST(body);
    http.end();
  }
  delay(5000);
}
```
