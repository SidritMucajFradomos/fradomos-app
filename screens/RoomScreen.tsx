import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Switch,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../constant/Colors';
import SensorBar from '../components/SensorBar';
import { publishMqttMessage } from '../hooks/useMqttSensor';

/* ---------- Nav types ---------- */
type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Room: { name: string };
};
type RoomRouteProp = RouteProp<RootStackParamList, 'Room'>;
type RoomNavProp  = NativeStackNavigationProp<RootStackParamList, 'Room'>;

/* ---------- Device models ---------- */
type SwitchDevice = { id: string; name: string; type: 'switch'; state: boolean };
type ACMode = 'cool' | 'hot' | 'dry' | 'fan';
type ACDevice = { id: string; name: string; type: 'ac'; temperature: number; mode: ACMode; power: boolean };
type Device = SwitchDevice | ACDevice;

/* ---------- Mock data ---------- */
const mockDevices: Record<string, Device[]> = {
  'Living Room': [
    { id: '1', name: 'Lights', type: 'switch', state: true },
    { id: '2', name: 'TV',     type: 'switch', state: false },
    { id: '3', name: 'Air Conditioner', type: 'ac', temperature: 23, mode: 'cool', power: true },
  ],
  Kitchen: [
    { id: '1', name: 'Lights', type: 'switch', state: false },
    { id: '2', name: 'Oven',   type: 'switch', state: false },
    { id: '3', name: 'Air Conditioner', type: 'ac', temperature: 20, mode: 'hot', power: false },
  ],
};
const iconFor = (d: Device) => (d.type === 'switch' ? 'bulb-outline' : 'snow-outline');

/* ---------- Layout constants ---------- */
const MAX_WIDTH = 640;
const isWeb = Platform.OS === 'web';

/* ---------- Component ---------- */
export default function RoomScreen({
  route,
  navigation,
}: {
  route: RoomRouteProp;
  navigation: RoomNavProp;
}) {
  const { name } = route.params;
  const [devices, setDevices] = useState<Device[]>(mockDevices[name] ?? []);

  /* Modal state */
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Device | null>(null);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'switch' | 'ac'>('switch');

  /* Modal helpers */
  const openAdd  = () => { setEditing(null); setFormName(''); setFormType('switch'); setModalVisible(true); };
  const openEdit = (d: Device) => { setEditing(d); setFormName(d.name); setFormType(d.type); setModalVisible(true); };

  const saveDevice = () => {
    if (!formName.trim()) return Alert.alert('Name required');
    if (editing) {
      setDevices(prev =>
        prev.map(d =>
          d.id === editing.id
            ? formType === 'switch'
              ? ({ ...d, name: formName, type: 'switch' } as Device)
              : ({ ...d, name: formName, type: 'ac', temperature: 22, mode: 'cool', power: false } as Device)
            : d
        )
      );
    } else {
      const id = Date.now().toString();
      const newDev: Device =
        formType === 'switch'
          ? { id, name: formName, type: 'switch', state: false }
          : { id, name: formName, type: 'ac', temperature: 22, mode: 'cool', power: false };
      setDevices(p => [...p, newDev]);
    }
    setModalVisible(false);
  };
  const deleteDevice = () => { if (editing) setDevices(p => p.filter(d => d.id !== editing.id)); setModalVisible(false); };

  /* Helpers for existing cards */
  const toggleSwitch = (id: string) =>
    setDevices(p => p.map(d => (d.id === id && d.type === 'switch' ? { ...d, state: !d.state } : d)));

  const updateAC = (id: string, changes: Partial<Omit<ACDevice, 'id' | 'type' | 'name'>>) => {
    setDevices(p =>
      p.map(d => {
        if (d.id === id && d.type === 'ac') {
          const updated = { ...d, ...changes };

          // If power changed, publish MQTT message
          if ('power' in changes) {
            publishMqttMessage('ac/power', changes.power ? 'on' : 'off');
          }

          return updated;
        }
        return d;
      })
    );
  };

  /* Card renderers */
  const SwitchCard = (device: SwitchDevice) => (
    <View style={[styles.card, isWeb && styles.cardWeb]}>
      <View style={styles.cardLeft}>
        <Ionicons name={iconFor(device)} size={28} color={Colors.primary} />
        <Text style={styles.deviceName}>{device.name}</Text>
      </View>
      <View style={styles.cardRight}>
        <Switch
          value={device.state}
          onValueChange={() => toggleSwitch(device.id)}
          thumbColor={Colors.primary}
          trackColor={{ false: '#ccc', true: Colors.primary }}
        />
        <TouchableOpacity onPress={() => openEdit(device)}>
          <Ionicons name="pencil-outline" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const ACCard = (device: ACDevice) => (
    <View style={[styles.acCard, isWeb && styles.cardWeb]}>
      <View style={styles.cardLeft}>
        <Ionicons name={iconFor(device)} size={28} color={Colors.primary} />
        <Text style={styles.deviceName}>{device.name}</Text>
      </View>
      <TouchableOpacity onPress={() => openEdit(device)} style={styles.editIcon}>
        <Ionicons name="pencil-outline" size={20} color={Colors.textSecondary} />
      </TouchableOpacity>

      <View style={styles.tempRow}>
        <TouchableOpacity onPress={() => updateAC(device.id, { temperature: Math.max(16, device.temperature - 1) })}>
          <Ionicons name="remove-circle" size={32} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.tempValue}>{device.temperature}°C</Text>
        <TouchableOpacity onPress={() => updateAC(device.id, { temperature: Math.min(30, device.temperature + 1) })}>
          <Ionicons name="add-circle" size={32} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.modeRow}>
        {(['cool', 'hot', 'dry', 'fan'] as const).map(m => (
          <TouchableOpacity
            key={m}
            onPress={() => updateAC(device.id, { mode: m })}
            style={[styles.modeOption, device.mode === m && styles.modeSelected]}
          >
            <Text style={[styles.modeText, device.mode === m && styles.modeTextSel]}>
              {m.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.powerRow}>
        <Text style={styles.powerLabel}>{device.power ? 'On' : 'Off'}</Text>
        <Switch
          value={device.power}
          onValueChange={() => updateAC(device.id, { power: !device.power })}
          thumbColor={Colors.primary}
          trackColor={{ false: '#ccc', true: Colors.primary }}
        />
      </View>
    </View>
  );

  /* ---------- JSX ---------- */
  return (
    <SafeAreaView style={screenStyles.screenWrapper}>
      <View style={screenStyles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={28} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.roomTitle}>{name}</Text>
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <Ionicons name="add-circle-outline" size={28} color={Colors.primary} />
            <Text style={styles.addTxt}>Add Device</Text>
          </TouchableOpacity>
        </View>

        {/* Live Temperature / Humidity */}
        <SensorBar />

        {/* Device list */}
        <FlatList
          data={devices}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: Spacing(8) }}
          renderItem={({ item }) => (item.type === 'switch' ? SwitchCard(item) : ACCard(item))}
        />
      </View>

      {/* Add / Edit modal */}
      <Modal transparent animationType="slide" visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.backdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Device' : 'Add Device'}</Text>
            <TextInput
              placeholder="Device Name"
              placeholderTextColor="#888"
              value={formName}
              onChangeText={setFormName}
              style={styles.input}
            />
            <View style={styles.modeRow}>
              {(['switch', 'ac'] as const).map(t => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setFormType(t)}
                  style={[styles.modeOption, formType === t && styles.modeSelected]}
                >
                  <Text style={[styles.modeText, formType === t && styles.modeTextSel]}>{t.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalBtns}>
              {editing && (
                <TouchableOpacity onPress={deleteDevice} style={styles.delBtn}>
                  <Ionicons name="trash-outline" size={20} color="#fff" />
                  <Text style={styles.delTxt}>Delete</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveDevice} style={styles.saveBtn}>
                <Text style={styles.saveTxt}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ---------- Responsive wrapper ---------- */
const screenStyles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_WIDTH,
    alignSelf: 'center',
    backgroundColor: Colors.background,
  },
});

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing(4),
    marginTop: Spacing(6),
    marginBottom: Spacing(1),
  },
  roomTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Dongle-Bold',
    fontSize: 48,
    color: Colors.textPrimary,
  },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing(1) },
  addTxt: { fontFamily: 'Dongle-Regular', fontSize: 24, color: Colors.primary, marginLeft: Spacing(1) },

  /* Card base */
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing(4),
    marginHorizontal: Spacing(4),
    marginBottom: Spacing(3),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardWeb: { cursor: 'pointer', transitionDuration: '150ms', transitionProperty: 'transform' } as any,

  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing(2) },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing(2) },
  deviceName: { fontFamily: 'Dongle-Regular', fontSize: 32, color: Colors.textPrimary },

  /* AC card */
  acCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing(4),
    marginHorizontal: Spacing(4),
    marginBottom: Spacing(3),
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  editIcon: { position: 'absolute', top: 8, right: 8 },
  tempRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing(4), marginTop: Spacing(2) },
  tempValue: { fontFamily: 'Dongle-Bold', fontSize: 48, color: Colors.textPrimary },

  modeRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing(2), marginTop: Spacing(3) },
  modeOption: { flex: 1, backgroundColor: '#e2e8f0', paddingVertical: Spacing(2), borderRadius: 8, alignItems: 'center' },
  modeSelected: { backgroundColor: Colors.primary },
  modeText: { fontFamily: 'Dongle-Regular', fontSize: 28, color: Colors.textPrimary },
  modeTextSel: { color: 'white', fontWeight: 'bold' },

  powerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing(4) },
  powerLabel: { fontFamily: 'Dongle-Bold', fontSize: 32, color: Colors.textPrimary },

  /* Modal */
  backdrop: {
    flex: 1,
    backgroundColor: '#00000077',
    justifyContent: 'center',
    paddingHorizontal: Spacing(6),
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing(4),
  },
  modalTitle: {
    fontFamily: 'Dongle-Bold',
    fontSize: 40,
    marginBottom: Spacing(3),
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    fontSize: 28,
    paddingHorizontal: Spacing(2),
    paddingVertical: Spacing(1),
    borderRadius: 8,
    marginBottom: Spacing(3),
    color: Colors.textPrimary,
  },
  modalBtns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing(2),
  },
  delBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.error,
    borderRadius: 8,
    paddingHorizontal: Spacing(3),
    paddingVertical: Spacing(2),
    alignItems: 'center',
    gap: Spacing(1),
  },
  delTxt: { color: 'white', fontSize: 20 },
  cancelBtn: {
    flex: 1,
    marginHorizontal: Spacing(1),
    paddingVertical: Spacing(2),
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.textSecondary,
    alignItems: 'center',
  },
  cancelTxt: { fontSize: 20, color: Colors.textSecondary },
  saveBtn: {
    flex: 1,
    marginHorizontal: Spacing(1),
    paddingVertical: Spacing(2),
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  saveTxt: { fontSize: 20, color: 'white' },
});
