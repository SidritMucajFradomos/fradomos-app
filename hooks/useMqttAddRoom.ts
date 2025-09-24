import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

const BROKER_WS = 'wss://fradomos.al/ws';
const MQTT_USERNAME = 'frad0m0s05smarth0me2025'; // change
const MQTT_PASSWORD = 's8o6m9o4d0a5r4f9!smartse!cret'; // change

const buildTopic = (circuitId: string) =>
  `homes/fradomos/main/fra/d1o2m3o4s5/${circuitId}/sync`;

export function useMqttAddRoom(
  circuitId: string,
  onReceive: (payload: string) => void
) {
  const clientRef = useRef<any>(null);
  const topic = buildTopic(circuitId);

  useEffect(() => {
    if (!circuitId) return;

    const connectMqtt = async () => {
      if (Platform.OS === 'web') {
        const Paho = require('paho-mqtt');
        const client = new Paho.Client(BROKER_WS, 'web_addroom_' + Math.random());

        client.onConnectionLost = (resp: any) =>
          console.warn('[MQTT] AddRoom disconnected', resp.errorMessage);

        client.onMessageArrived = (msg: any) => {
          if (msg.destinationName === topic) {
            onReceive(msg.payloadString);
          }
        };

        client.connect({
          userName: MQTT_USERNAME,
          password: MQTT_PASSWORD,
          useSSL: true,
          onSuccess: () => {
            console.log('[MQTT] Web AddRoom connected');
            clientRef.current = client;
            client.subscribe(topic);
          },
          onFailure: (err: any) =>
            console.error('[MQTT] Web AddRoom connect failed', err),
        });
      } else {
        const { Client } = require('react-native-paho-mqtt');
        const storage = {
          setItem: (k: string, v: string) => Promise.resolve((storage as any)[k] = v),
          getItem: (k: string) => Promise.resolve((storage as any)[k]),
          removeItem: (k: string) => Promise.resolve(delete (storage as any)[k]),
        };

        const client = new Client({
          uri: BROKER_WS,
          clientId: 'native_addroom_' + Math.random(),
          storage,
        });

        client.on('connectionLost', (resp: any) =>
          console.warn('[MQTT] AddRoom disconnected', resp.errorMessage));

        client.on('messageReceived', (msg: any) => {
          if (msg.destinationName === topic) {
            onReceive(msg.payloadString);
          }
        });

        try {
          await client.connect({
            userName: MQTT_USERNAME,
            password: MQTT_PASSWORD,
            useSSL: true,
          });
          await client.subscribe(topic);
          clientRef.current = client;
          console.log('[MQTT] Native AddRoom connected');
        } catch (err) {
          console.error('[MQTT] Native AddRoom connect failed', err);
        }
      }
    };

    connectMqtt();

    return () => {
      try {
        clientRef.current?.disconnect?.();
      } catch {}
    };
  }, [circuitId]);

  const sendMessage = (msg: string) => {
    if (!clientRef.current) return;
    const topic = buildTopic(circuitId);

    if (Platform.OS === 'web') {
      const Paho = require('paho-mqtt');
      const mqttMsg = new Paho.Message(msg);
      mqttMsg.destinationName = topic;
      clientRef.current.send(mqttMsg);
    } else {
      clientRef.current.send(topic, msg);
    }
  };

  return {
    sendLogin: () => sendMessage('login'),
    sendLoginOk: () => sendMessage('loginok'),
  };
}
