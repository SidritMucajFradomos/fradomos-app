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
import { Colors, Spacing, Font, Radius } from '../constant/Colors';
import SensorBar from '../components/SensorBar';
import Header from '../components/Header';
import { publishMqttMessage } from '../hooks/useMqttSensor';

/* ---------- Nav types ---------- */
type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Room: { name: string };
  Profile: undefined;
};
type RoomRouteProp = RouteProp<RootStackParamList, 'Room'>;
type RoomNavProp = NativeStackNavigationProp<RootStackParamList, 'Room'>;

/* ---------- Device models ---------- */
type SwitchDevice = { id: string; name: string; type: 'switch'; state: boolean };
type ACMode = 'cool' | 'hot';
type ACDevice = { id: string; name: string; type: 'ac'; temperature: number; mode: ACMode; power: boolean };
type Device = SwitchDevice | ACDevice;

/* ---------- Mock data ---------- */
const mockDevices: Record<string, Device[]> = {
  'Living Room': [
    { id: '1', name: 'Lights', type: 'switch', state: true },
    { id: '2', name: 'TV', type: 'switch', state: false },
    { id: '3', name: 'Air Conditioner', type: 'ac', temperature: 23, mode: 'cool', power: true },
  ],
  Kitchen: [
    { id: '1', name: 'Lights', type: 'switch', state: false },
    { id: '2', name: 'Oven', type: 'switch', state: false },
    { id: '3', name: 'Air Conditioner', type: 'ac', temperature: 20, mode: 'hot', power: false },
  ],
};

const iconFor = (d: Device) => (d.type === 'switch' ? 'bulb-outline' : 'snow-outline');

const isWeb = Platform.OS === 'web';

export default function RoomScreen({
  route,
  navigation,
}: {
  route: RoomRouteProp;
  navigation: RoomNavProp;
}) {
  const { name } = route.params;
  const [devices, setDevices] = useState<Device[]>(mockDevices[name] ?? []);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Device | null>(null);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'switch' | 'ac'>('switch');

  const [tempHumPopupVisible, setTempHumPopupVisible] = useState(false);

  // Dummy sensor values for popup
  const temperature = 22; // replace with real sensor data if available
  const humidity = 45;    // replace with real sensor data if available

  const openAdd = () => {
    setEditing(null);
    setFormName('');
    setFormType('switch');
    setModalVisible(true);
  };
  const openEdit = (d: Device) => {
    setEditing(d);
    setFormName(d.name);
    setFormType(d.type);
    setModalVisible(true);
  };

  const saveDevice = () => {
    if (!formName.trim()) return Alert.alert('Name required');
    if (editing) {
      setDevices(prev =>
        prev.map(d =>
          d.id === editing.id
            ? formType === 'switch'
              ? ({ ...d, name: formName, type: 'switch' } as Device)
              : ({ ...d, name: formName, type: 'ac', temperature: 24, mode: 'cool', power: false } as Device)
            : d
        )
      );
    } else {
      const id = Date.now().toString();
      const newDev: Device =
        formType === 'switch'
          ? { id, name: formName, type: 'switch', state: false }
          : { id, name: formName, type: 'ac', temperature: 24, mode: 'cool', power: false };
      setDevices(p => [...p, newDev]);
    }
    setModalVisible(false);
  };

  const deleteDevice = () => {
    if (editing) setDevices(p => p.filter(d => d.id !== editing.id));
    setModalVisible(false);
  };

  const toggleSwitch = (id: string) =>
    setDevices(p => p.map(d => (d.id === id && d.type === 'switch' ? { ...d, state: !d.state } : d)));

  const updateAC = (id: string, changes: Partial<Omit<ACDevice, 'id' | 'type' | 'name'>>) => {
    setDevices(p =>
      p.map(d => {
        if (d.id === id && d.type === 'ac') {
          const updated = { ...d, ...changes };

          // Publish MQTT messages for AC control
          if ('power' in changes) {
            publishMqttMessage('home/yea/ac/ir/power', changes.power ? 'powerOn' : 'powerOff');
          }
          if ('mode' in changes) {
            const modePayload = changes.mode === 'cool' ? 'modeCold' : 'modeHeat';
            publishMqttMessage('home/yea/ac/ir/mode', modePayload);
          }
          if ('temperature' in changes) {
            publishMqttMessage('home/yea/ac/ir/temp', changes.temperature!.toString());
          }

          return updated;
        }
        return d;
      })
    );
  };

  // Count devices and how many are on
  const totalDevices = devices.length;
  const devicesOn = devices.reduce((acc, d) => {
    if (d.type === 'switch' && d.state) return acc + 1;
    if (d.type === 'ac' && d.power) return acc + 1;
    return acc;
  }, 0);

  /* --- Cards --- */
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
        <TouchableOpacity onPress={() => openEdit(device)} style={{ marginLeft: Spacing(2) }}>
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
        {(['cool', 'hot'] as const).map(m => (
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

  /* --- Layout --- */
  return (
    <SafeAreaView style={screenStyles.screenWrapper}>
      {/* On web, show Header at top */}
      {isWeb && <Header />}

      <View style={screenStyles.container}>
        {/* Room title and Add Device */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={28} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.roomTitle} numberOfLines={1} ellipsizeMode="tail">
            {name}
          </Text>
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <Ionicons name="add-circle-outline" size={28} color={Colors.primary} />
            <Text style={styles.addTxt}>Add Device</Text>
          </TouchableOpacity>
        </View>

        {/* Devices bar below room title */}
        <View style={styles.devicesBar}>
          <Text style={styles.devicesText}>
            Devices: {devicesOn} ON / {totalDevices}
          </Text>
          <TouchableOpacity
            onPress={() => setTempHumPopupVisible(true)}
            style={styles.tempHumBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.tempHumBtnText}>Show Temp & Humidity</Text>
          </TouchableOpacity>
        </View>

        {/* Device list */}
        <FlatList
          data={devices}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: Spacing(16) }}
          renderItem={({ item }) => (item.type === 'switch' ? SwitchCard(item) : ACCard(item))}
        />
      </View>

      {/* On app, show Header at bottom */}
      {!isWeb && (
        <View style={styles.bottomHeader}>
          <Header />
        </View>
      )}

      {/* Add/Edit device modal */}
      <Modal
        transparent
        animationType="slide"
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
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
                  <Ionicons name="trash-outline" size={20} color={Colors.surface} />
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

      {/* Temp & Humidity popup */}
      <Modal
        transparent
        animationType="fade"
        visible={tempHumPopupVisible}
        onRequestClose={() => setTempHumPopupVisible(false)}
      >
        <View style={styles.popupBackdrop}>
          <View style={styles.popupCard}>
            <TouchableOpacity
              onPress={() => setTempHumPopupVisible(false)}
              style={styles.popupCloseBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle-outline" size={32} color={Colors.error} />
            </TouchableOpacity>
            <Text style={styles.popupTitle}>Environment</Text>
            <Text style={styles.popupText}>Temperature: {temperature}°C</Text>
            <Text style={styles.popupText}>Humidity: {humidity}%</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ---------- Styles ---------- */
const screenStyles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    backgroundColor: Colors.background,
  },
});

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing(4),
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  roomTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: Font.bold,
    fontSize: 48,
    color: Colors.textPrimary,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: Spacing(1),
  },
  addTxt: {
    fontFamily: Font.regular,
    fontSize: 24,
    color: Colors.primary,
    marginLeft: 4,
  },

  devicesBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing(4),
    paddingVertical: Spacing(3),
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  devicesText: {
    fontFamily: Font.bold,
    fontSize: 24,
    color: Colors.textPrimary,
  },
  tempHumBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing(3),
    paddingVertical: Spacing(2),
    borderRadius: Radius,
  },
  tempHumBtnText: {
    fontFamily: Font.bold,
    fontSize: 20,
    color: Colors.surface,
  },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius,
    padding: Spacing(4),
    marginHorizontal: Spacing(4),
    marginBottom: Spacing(3),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardWeb: {
    cursor: 'pointer',
  } as any,
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing(2),
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: Spacing(2),
  },
  deviceName: {
    fontFamily: Font.regular,
    fontSize: 32,
    color: Colors.textPrimary,
  },

  acCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius,
    padding: Spacing(4),
    marginHorizontal: Spacing(4),
    marginBottom: Spacing(3),
  },
  editIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  tempRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: Spacing(4),
  },
  tempValue: {
    fontFamily: Font.bold,
    fontSize: 48,
    color: Colors.textPrimary,
    marginHorizontal: Spacing(4),
  },

  modeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing(3),
  },
  modeOption: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingVertical: Spacing(2),
    borderRadius: Radius,
    alignItems: 'center',
    marginHorizontal: Spacing(1),
  },
  modeSelected: {
    backgroundColor: Colors.primary,
  },
  modeText: {
    fontFamily: Font.regular,
    fontSize: 28,
    color: Colors.textPrimary,
  },
  modeTextSel: {
    fontFamily: Font.bold,
    color: Colors.surface,
  },

  powerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing(4),
  },
  powerLabel: {
    fontFamily: Font.bold,
    fontSize: 32,
    color: Colors.textPrimary,
  },

  backdrop: {
    flex: 1,
    backgroundColor: '#00000055',
    justifyContent: 'center',
    padding: Spacing(6),
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius,
    padding: Spacing(4),
  },
  modalTitle: {
    fontFamily: Font.bold,
    fontSize: 40,
    textAlign: 'center',
    marginBottom: Spacing(4),
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius,
    paddingHorizontal: Spacing(3),
    paddingVertical: Spacing(2),
    fontSize: 28,
    color: Colors.textPrimary,
    marginBottom: Spacing(3),
  },
  modalBtns: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: Spacing(4),
  },
  cancelBtn: {
    paddingHorizontal: Spacing(4),
    paddingVertical: Spacing(2),
  },
  cancelTxt: {
    fontFamily: Font.bold,
    fontSize: 28,
    color: Colors.primaryDark,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing(4),
    paddingVertical: Spacing(2),
    borderRadius: Radius,
    marginLeft: Spacing(4),
  },
  saveTxt: {
    fontFamily: Font.bold,
    fontSize: 28,
    color: Colors.surface,
  },

  delBtn: {
    backgroundColor: Colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing(4),
    paddingVertical: Spacing(2),
    borderRadius: Radius,
    marginRight: 'auto',
  },
  delTxt: {
    color: Colors.surface,
    fontSize: 28,
    fontFamily: Font.bold,
    marginLeft: 8,
  },

  popupBackdrop: {
    flex: 1,
    backgroundColor: '#00000099',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popupCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius,
    padding: Spacing(5),
    width: '80%',
    maxWidth: 320,
    alignItems: 'center',
    position: 'relative',
  },
  popupCloseBtn: {
    position: 'absolute',
    top: Spacing(2),
    right: Spacing(2),
  },
  popupTitle: {
    fontFamily: Font.bold,
    fontSize: 36,
    marginBottom: Spacing(3),
  },
  popupText: {
    fontFamily: Font.regular,
    fontSize: 28,
    marginVertical: Spacing(1),
  },

  bottomHeader: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
