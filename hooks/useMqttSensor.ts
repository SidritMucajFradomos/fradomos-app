import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/* ---------------------------------------------------------------- *
 * ‑ Live sensor data from MQTT broker                              *
 * ---------------------------------------------------------------- */
export interface SensorData {
  temperature?: number;
  humidity?: number;
}

/* Adjust these if you change broker / topic later ---------------- */
const BROKER_WS = 'wss://fradomos.al/ws';
const SENSOR_TOPIC = 'home/livingroom/sensor';

let mqttClient: any; // Global shared client

/* ---------------------------------------------------------------- *
 * ‑ MAIN HOOK                                                      *
 * ---------------------------------------------------------------- */
export default function useMqttSensor(): SensorData {
  const [data, setData] = useState<SensorData>({});

  useEffect(() => {
    /* ========= 1. WEB (Expo Web)  ========= */
    if (Platform.OS === 'web') {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Paho = require('paho-mqtt'); // browser build
      mqttClient = new Paho.Client(BROKER_WS, 'web_' + Math.random());

      mqttClient.onConnectionLost = (resp: any) =>
        console.warn('[MQTT] connection lost', resp.errorMessage);

      mqttClient.onMessageArrived = (msg: any) => {
        try {
          const json = JSON.parse(msg.payloadString);
          setData({ temperature: json.temperature, humidity: json.humidity });
        } catch (e) {
          console.warn('[MQTT] bad JSON', e);
        }
      };

      mqttClient.connect({
        useSSL: true,
        onSuccess: () => mqttClient.subscribe(SENSOR_TOPIC),
        onFailure: (e: any) => console.error('[MQTT] connect fail', e),
      });
    }
    /* ========= 2. NATIVE (Android / iOS)  ========= */
    else {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Client } = require('react-native-paho-mqtt');

      // minimal in‑memory storage object required by RN‑Paho
      const storage = {
        setItem: (k: string, v: string) => Promise.resolve((storage as any)[k] = v),
        getItem: (k: string) => Promise.resolve((storage as any)[k]),
        removeItem: (k: string) => Promise.resolve(delete (storage as any)[k]),
      };

      mqttClient = new Client({
        uri: BROKER_WS,
        clientId: 'native_' + Math.random(),
        storage,
      });

      mqttClient.on('connectionLost', (resp: any) =>
        console.warn('[MQTT] connection lost', resp.errorMessage));

      mqttClient.on('messageReceived', (msg: any) => {
        try {
          const json = JSON.parse(msg.payloadString);
          setData({ temperature: json.temperature, humidity: json.humidity });
        } catch (e) {
          console.warn('[MQTT] bad JSON', e);
        }
      });

      mqttClient
        .connect()
        .then(() => mqttClient.subscribe(SENSOR_TOPIC))
        .catch((e: any) => console.error('[MQTT] native connect error', e));
    }

    /* ========= Clean‑up on unmount ========= */
    return () => {
      try { mqttClient?.disconnect?.(); } catch { /* ignore */ }
    };
  }, []);

  return data;
}

/* ---------------------------------------------------------------- *
 * ‑ PUBLISH MQTT MESSAGE (for use outside hook)                   *
 * ---------------------------------------------------------------- */
export async function publishMqttMessage(topic: string, message: string) {
  if (!mqttClient) {
    console.warn('[MQTT] Client not initialized yet');
    return;
  }

  if (Platform.OS === 'web') {
    if (mqttClient.isConnected()) {
      mqttClient.publish(topic, message);
    } else {
      console.warn('[MQTT] Web client not connected');
    }
  } else {
    if (mqttClient.isConnected()) {
      try {
        await mqttClient.send(topic, message);
      } catch (err) {
        console.error('[MQTT] Native send error', err);
      }
    } else {
      console.warn('[MQTT] Native client not connected');
    }
  }
}
