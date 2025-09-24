import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

export interface SensorData {
  temperature?: number;
  humidity?: number;
}

const BROKER_WS = 'mqtt://fradomos.local:1883';
const SENSOR_TOPIC = 'home/livingroom/sensor';

const MQTT_USERNAME = 'admin';  // Your MQTT username
const MQTT_PASSWORD = 'root';  // Your MQTT password

export const mqttClientRef: { current: any } = { current: null };
let mqttClient: any = null;
let initialized = false;

const storage = {
  setItem: (k: string, v: string) => Promise.resolve((storage as any)[k] = v),
  getItem: (k: string) => Promise.resolve((storage as any)[k]),
  removeItem: (k: string) => Promise.resolve(delete (storage as any)[k]),
};

export async function initMqttClient(): Promise<void> {
  if (mqttClient && mqttClient.isConnected && mqttClient.isConnected()) {
    return; // already connected
  }

  if (mqttClient) {
    try {
      await mqttClient.disconnect();
    } catch {}
    mqttClient = null;
    initialized = false;
  }

  if (initialized) return;
  initialized = true;

  if (Platform.OS === 'web') {
    // Web - Paho MQTT
    const Paho = require('paho-mqtt');
    mqttClient = new Paho.Client(BROKER_WS, 'web_' + Math.random());

    mqttClient.onConnectionLost = (resp: any) =>
      console.warn('[MQTT] connection lost', resp.errorMessage);

    mqttClient.onMessageArrived = (msg: any) => {
      // This can be handled externally in your hook/component
    };

    mqttClient.connect({
      userName: MQTT_USERNAME,
      password: MQTT_PASSWORD,
      useSSL: true,
      onSuccess: () => {
        console.log('[MQTT] Web client connected');
        mqttClientRef.current = mqttClient;
        mqttClient.subscribe(SENSOR_TOPIC);
      },
      onFailure: (e: any) => console.error('[MQTT] connect fail', e),
      reconnect: true,
    });
  } else {
    // React Native - react-native-paho-mqtt
    const { Client } = require('react-native-paho-mqtt');
    mqttClient = new Client({
      uri: BROKER_WS,
      clientId: 'native_' + Math.random(),
      storage,
    });

    mqttClient.on('connectionLost', (resp: any) =>
      console.warn('[MQTT] connection lost', resp.errorMessage));

    try {
      await mqttClient.connect({
        userName: MQTT_USERNAME,
        password: MQTT_PASSWORD,
        useSSL: true,
        reconnect: true,
      });
      await mqttClient.subscribe(SENSOR_TOPIC);
      mqttClientRef.current = mqttClient;
      console.log('[MQTT] Native client connected');
    } catch (e) {
      console.error('[MQTT] Native connection failed', e);
    }
  }
}

export async function publishMqttMessage(topic: string, message: string) {
  if (!mqttClient) {
    console.warn('[MQTT] Client not initialized yet');
    return;
  }

  if (Platform.OS === 'web') {
    if (mqttClient.isConnected()) {
      const Paho = require('paho-mqtt');
      const msg = new Paho.Message(message);
      msg.destinationName = topic;
      mqttClient.send(msg);
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

export default function useMqttSensor(): SensorData {
  const [data, setData] = useState<SensorData>({});

  useEffect(() => {
    const setup = async () => {
      await initMqttClient();

      if (mqttClient) {
        if (Platform.OS === 'web') {
          mqttClient.onMessageArrived = (msg: any) => {
            try {
              const json = JSON.parse(msg.payloadString);
              setData({ temperature: json.temperature, humidity: json.humidity });
            } catch (e) {
              console.warn('[MQTT] bad JSON', e);
            }
          };
        } else {
          mqttClient.on('messageReceived', (msg: any) => {
            try {
              const json = JSON.parse(msg.payloadString);
              setData({ temperature: json.temperature, humidity: json.humidity });
            } catch (e) {
              console.warn('[MQTT] bad JSON', e);
            }
          });
        }
      }
    };

    setup();

    return () => {
      try {
        mqttClient?.disconnect?.();
      } catch {}
      mqttClient = null;
      mqttClientRef.current = null;
      initialized = false;
    };
  }, []);

  return data;
}
