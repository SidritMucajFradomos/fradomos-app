import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Switch,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Platform,
  DeviceEventEmitter, // added
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../constant/Colors';
import useMqttSensor, { initMqttClient, publishMqttMessage } from '../hooks/initMqttSensor';
// MQTT notes:
// - initMqttClient(): triggers/initializes the MQTT client connection.
// - publishMqttMessage(topic, payload): helper used to publish messages.
// - useMqttSensor(): hook that subscribes to sensor topics and returns sensor data.
// Actual broker host/port/credentials/options are implemented in ../hooks/initMqttSensor (open that file to see connection details).
import ErrorBanner from '../components/ErrorBanner';
import LoadingOverlay from '../components/LoadingOverlay';
import { RootStackParamList } from '../navigation/AppNavigator';
import { API_URL } from '../constant/Api';

type RoomRouteProp = RouteProp<RootStackParamList, 'Room'>;
type RoomNavProp = NativeStackNavigationProp<RootStackParamList, 'Room'>;

type ACMode = 'cool' | 'hot';
type ACDevice = {
  id: string;
  name: string;
  type: 'ac';
  temperature: number;
  mode: ACMode;
  power: boolean;
  mqttTopicBase: string;
};

type LightDevice = {
  id: string;
  name: string;
  type: 'light';
  state: boolean;
  index: number; // MQTT index for on/off commands
};

type Device = ACDevice | LightDevice;

const MAX_LIGHTS = 7;

// Derive WS URL from API_URL
const WS_URL = API_URL.replace(/^http/, 'ws');

export default function RoomScreen({ route, navigation }: { route: RoomRouteProp; navigation: RoomNavProp }) {
  const { roomId } = route.params;

  const [roomName, setRoomName] = useState<string>('Loading...');
  const [circuitId, setCircuitId] = useState<string>('');
  const [acDevice, setAcDevice] = useState<ACDevice | null>(null);
  const [lightDevices, setLightDevices] = useState<LightDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const sensorData = useMqttSensor();
  const wsRef = useRef<WebSocket | null>(null);

  // Capture MQTT init errors and console MQTT errors
  useEffect(() => {
    const originalError = console.error;
    console.error = (...args: any[]) => {
      let matched = false;
      try {
        const str = args.map((a) => (typeof a === 'string' ? a : a?.message || '')).join(' ');
        if (str.includes('[MQTT]') || str.includes('AMQJS0007E')) {
          matched = true;
          setErrorMsg(str);
        }
      } catch { }
      if (!matched) originalError(...args);
    };
    return () => {
      console.error = originalError;
    };
  }, []);

  // Initialize MQTT once on mount with error catch
  useEffect(() => {
    (async () => {
      try {
        // This is where the MQTT connection is initiated.
        // initMqttClient() lives in ../hooks/initMqttSensor and contains the broker connection/config.
        await initMqttClient();
      } catch (e: any) {
        setErrorMsg(`[MQTT] ${e?.message || 'Connection failed'}`);
      }
    })();
  }, []);

  // NEW helper: normalize status into useful fields
  const parseStatus = (status: any) => {
    const out: { power?: boolean; temperature?: number; mode?: string } = {};
    if (status == null) return out;
    if (typeof status === 'boolean') {
      out.power = status;
      return out;
    }
    if (typeof status === 'number') {
      out.power = status === 1;
      return out;
    }
    if (typeof status === 'string') {
      const s = status.toLowerCase();
      out.power = s.includes('on') || s === '1' || s === 'true';
      const tempMatch = s.match(/(\d{2})/);
      if (tempMatch) out.temperature = Number(tempMatch[1]);
      if (s.includes('heat')) out.mode = 'hot';
      if (s.includes('cool') || s.includes('cold')) out.mode = 'cool';
      return out;
    }
    if (typeof status === 'object') {
      try {
        if ('power' in status) out.power = !!status.power;
        if ('temperature' in status) out.temperature = Number(status.temperature);
        if ('mode' in status) out.mode = String(status.mode);
      } catch { }
      return out;
    }
    return out;
  };

  // Fetch room info + devices
  const fetchRoomAndDevices = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setErrorMsg('No token found. Please login again.');
        navigation.navigate('Login');
        return;
      }

      // Fetch room info (including circuit_id)
      const roomRes = await fetch(`${API_URL}/rooms/${roomId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!roomRes.ok) throw new Error('Failed to fetch room info');
      const roomData = await roomRes.json();
      setRoomName(roomData.name || 'Unknown Room');
      setCircuitId(roomData.circuit_id || '');

      // Fetch devices in this room
      const devRes = await fetch(`${API_URL}/devices/room/${roomId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!devRes.ok) throw new Error('Failed to fetch devices');
      const devices = await devRes.json();

      // NEW: publish a "shown" message for each device to fradomos/home/dev/dev[dev_id]
      try {
        devices.forEach((d: any) => {
          if (!d?.id) return;
          const topic = `fradomos/home/dev/dev${d.id}`;
          const payload = JSON.stringify({ event: 'shown', deviceId: d.id, roomId });
          // publishMqttMessage sends MQTT publish via the client initialized above.
          publishMqttMessage(topic, payload);
        });
      } catch (e: any) {
        setErrorMsg(e?.message || 'Failed to publish device events');
      }

      // Use new `category` column and parse `status` to derive runtime state
      const ac = devices.find((d: any) => (d.category || '').toString().toLowerCase() === 'ac' || (d.category || '').toString().toLowerCase() === 'aircon');
      const lights = devices.filter((d: any) => (d.category || '').toString().toLowerCase() === 'light' || (d.category || '').toString().toLowerCase() === 'lamp');

      if (ac) {
        const parsed = parseStatus(ac.status);
        setAcDevice({
          id: String(ac.id),
          name: ac.name ?? 'AC',
          type: 'ac',
          temperature: parsed.temperature ?? (ac.temperature ?? 22),
          mode: (parsed.mode as ACMode) ?? (ac.mode ?? 'cool'),
          power: parsed.power ?? (typeof ac.power !== 'undefined' ? !!ac.power : false),
          mqttTopicBase: (ac.mqtt_topic_base as string) ?? `home/yea/ac/ir`,
        });
      } else {
        setAcDevice(null);
      }

      setLightDevices(
        lights.map((d: any, idx: number) => {
          const parsed = parseStatus(d.status);
          return {
            id: String(d.id),
            name: d.name ?? `Light ${idx + 1}`,
            type: 'light',
            state: parsed.power ?? (typeof d.state !== 'undefined' ? !!d.state : false),
            index: idx + 1,
          } as LightDevice;
        })
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load room data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoomAndDevices();
  }, [roomId]);

  // AC control via MQTT
  const updateAC = (changes: Partial<Omit<ACDevice, 'id' | 'type' | 'name'>>) => {
    if (!acDevice) return;
    const updated = { ...acDevice, ...changes };
    const base = acDevice.mqttTopicBase;
    try {
      if ('power' in changes) {
        // Publishing MQTT messages for AC control (topic derived from acDevice.mqttTopicBase)
        publishMqttMessage(`${base}/power`, changes.power ? 'powerOn' : 'powerOff');
      }
      if ('mode' in changes) {
        publishMqttMessage(`${base}/mode`, changes.mode === 'cool' ? 'modeCold' : 'modeHeat');
      }
      if ('temperature' in changes) {
        publishMqttMessage(`${base}/temp`, `${Math.round(changes.temperature!)}`);
      }
      setAcDevice(updated);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to send AC command');
    }
  };

  // WebSocket connection for light control
  useEffect(() => {
    let isMounted = true;
    let reconnectTimer: any;

    const connect = () => {
      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          // ...optional: console.log('WS connected');
        };
        ws.onmessage = (evt) => {
          // ...optional: handle messages if needed
        };
        ws.onerror = (err) => {
          // ...optional: console.error('WS error', err);
        };
        ws.onclose = () => {
          if (!isMounted) return;
          reconnectTimer = setTimeout(connect, 2000);
        };
      } catch (e: any) {
        // ...optional: console.error('WS init failed', e);
      }
    };

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      try {
        wsRef.current?.close();
      } catch { }
      wsRef.current = null;
    };
  }, []);

  const sendWs = (payload: any) => {
    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(payload));
      } else {
        throw new Error('WebSocket not connected');
      }
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to send command');
    }
  };

  // Light toggle via WebSocket (replaces MQTT for lights)
  const toggleLight = async (deviceId: string, deviceIndex: number, newState: boolean) => {
    if (!circuitId) {
      setErrorMsg('Circuit ID is missing. Cannot toggle light.');
      return;
    }
    if (deviceIndex < 1 || deviceIndex > MAX_LIGHTS) {
      setErrorMsg(`Device index must be between 1 and ${MAX_LIGHTS}`);
      return;
    }

    // Optimistic UI update
    const prev = lightDevices.slice();
    const optimistic = lightDevices.map((dev) =>
      dev.index === deviceIndex ? { ...dev, state: newState } : dev
    );
    setLightDevices(optimistic);

    // Build WS payload
    const payload = {
      device: 'light',
      action: newState ? 'on' : 'off',
      index: deviceIndex,
      circuitId,
      roomId,
    };

    try {
      // send WS command
      sendWs(payload);

      // Update DB: fetch current device to preserve fields, then PUT with new status (1/0)
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Not authenticated');

      const getRes = await fetch(`${API_URL}/devices/${deviceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!getRes.ok) throw new Error('Failed to fetch device before update');
      const deviceObj = await getRes.json();

      const putRes = await fetch(`${API_URL}/devices/${deviceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: deviceObj.name,
          category: deviceObj.category,
          status: newState ? 1 : 0,
        }),
      });
      if (!putRes.ok) throw new Error('Failed to update device status on server');
    } catch (e: any) {
      // Revert optimistic UI and report error
      setLightDevices(prev);
      setErrorMsg(e?.message || 'Failed to toggle light');
    }
  };

  // Derive environment readings (best-effort)
  const roomTemp = (sensorData as any)?.temperature ?? (sensorData as any)?.temp ?? (sensorData as any)?.t ?? null;
  const roomHum = (sensorData as any)?.humidity ?? (sensorData as any)?.hum ?? (sensorData as any)?.h ?? null;

  // Only actual sensor values; otherwise show placeholders
  const effectiveTemp = roomTemp != null && !isNaN(Number(roomTemp)) ? Math.round(Number(roomTemp)) : null;
  const effectiveHum = roomHum != null && !isNaN(Number(roomHum)) ? Math.round(Number(roomHum)) : null;

  // Temp mood coloring and grid config
  const tempState = effectiveTemp == null ? 'unknown' : effectiveTemp >= 28 ? 'hot' : effectiveTemp <= 18 ? 'cold' : 'ok';
  const tempMoodStyle =
    tempState === 'hot'
      ? { backgroundColor: '#ffecec', borderColor: '#ffd3d0' }
      : tempState === 'cold'
        ? { backgroundColor: '#eaf2ff', borderColor: '#d6e4ff' }
        : { backgroundColor: '#eef7f0', borderColor: '#d8efe0' };
  const humMoodStyle = { backgroundColor: '#f7f8fa', borderColor: Colors.border };
  const deviceGridColumns = 2;

  // Listen to theme updates and rebuild styles
  const [themeTick, setThemeTick] = useState(0);
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('appThemeChanged', () =>
      setThemeTick((t) => t + 1)
    );
    return () => sub.remove();
  }, []);
  const styles = React.useMemo(() => createStyles(), [themeTick]);

  return (
    <SafeAreaView style={styles.screenWrapper}>
      <ErrorBanner message={errorMsg} onDismiss={() => setErrorMsg(null)} />
      <LoadingOverlay visible={loading} text="Loading room..." />
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={28} color={Colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.roomName}>{roomName}</Text>
        </View>

        {/* Room conditions */}
        <View style={styles.envCard}>
          <View style={styles.envGrid}>
            <View style={[styles.envStat, tempMoodStyle]}>
              <Ionicons name="thermometer-outline" size={16} color={Colors.textSecondary} />
              <View style={styles.envValRow}>
                <Text style={styles.envBig}>{effectiveTemp != null ? effectiveTemp : '—'}</Text>
                <Text style={styles.envUnit}>°C</Text>
              </View>
              <Text style={styles.envLabel}>Temperature</Text>
            </View>
            <View style={[styles.envStat, humMoodStyle]}>
              <Ionicons name="water-outline" size={16} color={Colors.textSecondary} />
              <View style={styles.envValRow}>
                <Text style={styles.envBig}>{effectiveHum != null ? effectiveHum : '—'}</Text>
                <Text style={styles.envUnit}>%</Text>
              </View>
              <Text style={styles.envLabel}>Humidity</Text>
            </View>
          </View>
        </View>

        {loading ? null : (
          <FlatList
            key={`grid-${deviceGridColumns}`}
            data={lightDevices}
            keyExtractor={(item) => String(item.id)}
            numColumns={deviceGridColumns}
            columnWrapperStyle={styles.gridRowDevices}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              acDevice ? (
                <View style={[styles.deviceCard, styles.acCard]}>
                  <View style={styles.acHeader}>
                    <Ionicons name="snow-outline" size={20} color={acDevice.mode === 'cool' ? Colors.primary : Colors.textSecondary} />
                    <Text style={styles.deviceName}>{acDevice.name}</Text>
                    <Ionicons name="flame-outline" size={20} color={acDevice.mode === 'hot' ? Colors.primary : Colors.textSecondary} />
                  </View>
                  <Text style={styles.acTemp}>{Math.round(acDevice.temperature)}°C</Text>
                  <View style={styles.acControlsRow}>
                    <TouchableOpacity style={[styles.acPill, acDevice.power && styles.acPillActive]} onPress={() => updateAC({ power: !acDevice.power })}>
                      <Ionicons name={acDevice.power ? 'power' : 'power'} size={16} color={acDevice.power ? '#fff' : Colors.primary} />
                      <Text style={[styles.acPillText, acDevice.power && styles.acPillTextActive]}>{acDevice.power ? 'On' : 'Off'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.acPill, acDevice.mode === 'cool' && styles.acPillActive]} onPress={() => updateAC({ mode: 'cool' })}>
                      <Ionicons name="snow-outline" size={16} color={acDevice.mode === 'cool' ? '#fff' : Colors.primary} />
                      <Text style={[styles.acPillText, acDevice.mode === 'cool' && styles.acPillTextActive]}>Cool</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.acPill, acDevice.mode === 'hot' && styles.acPillActive]} onPress={() => updateAC({ mode: 'hot' })}>
                      <Ionicons name="flame-outline" size={16} color={acDevice.mode === 'hot' ? '#fff' : Colors.primary} />
                      <Text style={[styles.acPillText, acDevice.mode === 'hot' && styles.acPillTextActive]}>Heat</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.acTempRow}>
                    <TouchableOpacity style={styles.tempRound} onPress={() => updateAC({ temperature: Math.max(16, acDevice.temperature - 1) })}>
                      <Text style={styles.tempRoundText}>-</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.tempRound} onPress={() => updateAC({ temperature: Math.min(30, acDevice.temperature + 1) })}>
                      <Text style={styles.tempRoundText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <View style={[styles.deviceCard, styles.lightCard, styles.lightGridCard]}>
                <View style={styles.lightLeft}>
                  <View style={[styles.lightIconWrap, item.state && { backgroundColor: Colors.primary }]}>
                    <Ionicons name="bulb-outline" size={16} color={item.state ? '#fff' : Colors.primary} />
                  </View>
                  <Text style={styles.deviceName} numberOfLines={1}>{item.name}</Text>
                </View>
                <Switch
                  value={item.state}
                  onValueChange={(val) => toggleLight(item.id, item.index, val)}
                  trackColor={{ false: '#d9d9d9', true: '#bcd3ff' }}
                  thumbColor={item.state ? Colors.primary : '#f4f4f4'}
                />
              </View>
            )}
          />
        )}

        {/* Add Device Modal removed */}
      </View>
    </SafeAreaView>
  );
}

const createStyles = () =>
  StyleSheet.create({
    screenWrapper: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    container: {
      flex: 1,
      padding: Spacing(5),
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing(3),
    },
    roomName: {
      fontSize: 30,
      fontFamily: 'Dongle-Bold',
      color: Colors.textPrimary,
    },
    list: { paddingBottom: Spacing(20) },
    deviceCard: {
      backgroundColor: Colors.surface,
      borderRadius: 14,
      padding: Spacing(3),
      marginBottom: Spacing(3),
      borderWidth: 1,
      borderColor: Colors.border,
    },
    deviceName: { fontSize: 22, fontFamily: 'Dongle-Bold', color: Colors.textPrimary },

    // AC redesigned styles
    acCard: { alignItems: 'center' },
    acHeader: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    acTemp: { fontSize: 44, fontFamily: 'Dongle-Bold', color: Colors.textPrimary, textAlign: 'center', marginTop: Spacing(1) },
    acControlsRow: { flexDirection: 'row', gap: Spacing(2), marginTop: Spacing(2) },
    acPill: { flexDirection: 'row', alignItems: 'center', gap: Spacing(1), borderWidth: 1, borderColor: Colors.border, borderRadius: 999, paddingVertical: Spacing(1), paddingHorizontal: Spacing(2), backgroundColor: Colors.surface },
    acPillActive: { backgroundColor: Colors.primary },
    acPillText: { fontFamily: 'Dongle-Bold', fontSize: 18, color: Colors.textPrimary },
    acPillTextActive: { color: '#fff' },
    acTempRow: { flexDirection: 'row', gap: Spacing(4), marginTop: Spacing(3) },
    tempRound: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
    tempRoundText: { fontFamily: 'Dongle-Bold', fontSize: 22, color: Colors.textPrimary },

    // Light card styles
    lightCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    lightLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing(2), flex: 1 },
    lightIconWrap: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: Colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: Colors.background, // was '#f1f3f5'
    },
    gridRowDevices: { justifyContent: 'space-between' },
    lightGridCard: { flex: 1 },

    // Environment card styles
    envCard: {
      backgroundColor: Colors.surface,
      borderWidth: 1,
      borderColor: Colors.border,
      borderRadius: 10,
      paddingVertical: Spacing(1.5),
      paddingHorizontal: Spacing(2),
      marginBottom: Spacing(2),
    },
    envGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing(2) },
    envStat: { flex: 1, borderRadius: 10, borderWidth: 1, paddingVertical: Spacing(1.5), paddingHorizontal: Spacing(2), alignItems: 'center' },
    envValRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: Spacing(0.5) },
    envBig: { fontFamily: 'Dongle-Bold', fontSize: 30, color: Colors.textPrimary, lineHeight: 32 },
    envUnit: { fontFamily: 'Dongle-Regular', fontSize: 16, color: Colors.textSecondary, marginLeft: 4 },
    envLabel: { fontFamily: 'Dongle-Regular', fontSize: 16, color: Colors.textSecondary, marginTop: Spacing(0.5) },
  });
   