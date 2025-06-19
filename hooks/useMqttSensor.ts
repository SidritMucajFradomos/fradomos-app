// hooks/useMqttSensor.ts
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

/* ---------------------------------------------------------------- *
 * ‑ MAIN HOOK                                                      *
 * ---------------------------------------------------------------- */
export default function useMqttSensor(): SensorData {
  const [data, setData] = useState<SensorData>({});

  useEffect(() => {
    let client: any;

    /* ========= 1. WEB (Expo Web)  ========= */
    if (Platform.OS === 'web') {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Paho = require('paho-mqtt');            // browser build
      client = new Paho.Client(BROKER_WS, 'web_' + Math.random());

      client.onConnectionLost = (resp: any) =>
        console.warn('[MQTT] connection lost', resp.errorMessage);

      client.onMessageArrived = (msg: any) => {
        try {
          const json = JSON.parse(msg.payloadString);
          setData({ temperature: json.temperature, humidity: json.humidity });
        } catch (e) {
          console.warn('[MQTT] bad JSON', e);
        }
      };

      client.connect({
        useSSL: true,
        onSuccess: () => client.subscribe(SENSOR_TOPIC),
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

      client = new Client({
        uri: BROKER_WS,
        clientId: 'native_' + Math.random(),
        storage,
      });

      client.on('connectionLost', (resp: any) =>
        console.warn('[MQTT] connection lost', resp.errorMessage));

      client.on('messageReceived', (msg: any) => {
        try {
          const json = JSON.parse(msg.payloadString);
          setData({ temperature: json.temperature, humidity: json.humidity });
        } catch (e) {
          console.warn('[MQTT] bad JSON', e);
        }
      });

      client
        .connect()
        .then(() => client.subscribe(SENSOR_TOPIC))
        .catch((e: any) => console.error('[MQTT] native connect error', e));
    }

    /* ========= Clean‑up on unmount ========= */
    return () => {
      try { client?.disconnect?.(); } catch { /* ignore */ }
    };
  }, []);

  return data;
}
