import React, { useEffect, useState } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Font, Radius } from '../constant/Colors';
import Header from '../components/Header';
import { publishMqttMessage } from '../hooks/useMqttSensor';

type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Room: { name: string; roomId: string };
  Profile: undefined;
};
type RoomRouteProp = RouteProp<RootStackParamList, 'Room'>;
type RoomNavProp = NativeStackNavigationProp<RootStackParamList, 'Room'>;

type SwitchDevice = { id: string; name: string; type: 'switch'; state: boolean };
type ACMode = 'cool' | 'hot';
type ACDevice = { id: string; name: string; type: 'ac'; temperature: number; mode: ACMode; power: boolean };
type Device = SwitchDevice | ACDevice;

const isWeb = Platform.OS === 'web';

export default function RoomScreen({
  route,
  navigation,
}: {
  route: RoomRouteProp;
  navigation: RoomNavProp;
}) {
  const { name, roomId } = route.params;

  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Device | null>(null);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'switch' | 'ac'>('switch');
  const [tempHumPopupVisible, setTempHumPopupVisible] = useState(false);

  // Dummy sensor values for popup
  const temperature = 22;
  const humidity = 45;

  // Fetch devices for this room on mount or roomId change
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          Alert.alert('Error', 'No token found, please login again.');
          navigation.navigate('Login');
          return;
        }

        const response = await fetch(`http://api.fradomos.al:3000/devices/room/${roomId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          Alert.alert('Error fetching devices', errorData.error || 'Unknown error');
          setDevices([]);
          setLoading(false);
          return;
        }

        const data: Device[] = await response.json();
        setDevices(data);
      } catch (error) {
        Alert.alert('Network Error', 'Failed to fetch devices.');
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();
  }, [roomId, navigation]);

  // Open add modal
  const openAdd = () => {
    setEditing(null);
    setFormName('');
    setFormType('switch');
    setModalVisible(true);
  };
  // Open edit modal
  const openEdit = (d: Device) => {
    setEditing(d);
    setFormName(d.name);
    setFormType(d.type);
    setModalVisible(true);
  };

  // Save device (add or edit) with backend calls
  const saveDevice = async () => {
    if (!formName.trim()) return Alert.alert('Name required');

    const token = await AsyncStorage.getItem('token');
    if (!token) {
      Alert.alert('Error', 'No token found, please login again.');
      navigation.navigate('Login');
      return;
    }

    if (editing) {
      // Edit existing device
      try {
        const response = await fetch(`http://api.fradomos.al:3000/devices/${editing.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: formName,
            type: formType,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          Alert.alert('Error updating device', errorData.error || 'Unknown error');
          return;
        }

        setDevices(prev =>
          prev.map(d =>
            d.id === editing.id
              ? formType === 'switch'
                ? ({ ...d, name: formName, type: 'switch' } as Device)
                : ({ ...d, name: formName, type: 'ac', temperature: 24, mode: 'cool', power: false } as Device)
              : d
          )
        );
        setModalVisible(false);
      } catch (error) {
        Alert.alert('Network Error', 'Failed to update device.');
      }
    } else {
      // Add new device
      try {
        const response = await fetch(`http://api.fradomos.al:3000/devices`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            room_id: roomId,
            type: formType,
            name: formName,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          Alert.alert('Error adding device', errorData.error || 'Failed to add device');
          return;
        }

        const data = await response.json();

        const newDevice: Device =
          formType === 'switch'
            ? { id: data.id.toString(), name: formName, type: 'switch', state: false }
            : { id: data.id.toString(), name: formName, type: 'ac', temperature: 24, mode: 'cool', power: false };

        setDevices(prev => [...prev, newDevice]);
        setModalVisible(false);
      } catch (error) {
        Alert.alert('Network Error', 'Failed to add device');
      }
    }
  };

  // Delete device with backend call
  const deleteDevice = async () => {
    if (!editing) return;

    const token = await AsyncStorage.getItem('token');
    if (!token) {
      Alert.alert('Error', 'No token found, please login again.');
      navigation.navigate('Login');
      return;
    }

    try {
      const response = await fetch(`http://api.fradomos.al:3000/devices/${editing.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        Alert.alert('Error deleting device', errorData.error || 'Unknown error');
        return;
      }

      setDevices(prev => prev.filter(d => d.id !== editing.id));
      setModalVisible(false);
    } catch (error) {
      Alert.alert('Network Error', 'Failed to delete device');
    }
  };

  // Toggle switch device locally (you can add MQTT or backend sync if needed)
  const toggleSwitch = (id: string) =>
    setDevices(p => p.map(d => (d.id === id && d.type === 'switch' ? { ...d, state: !d.state } : d)));

  // Update AC device (with MQTT publishing)
  const updateAC = (id: string, changes: Partial<Omit<ACDevice, 'id' | 'type' | 'name'>>) => {
    setDevices(p =>
      p.map(d => {
        if (d.id === id && d.type === 'ac') {
          const updated = { ...d, ...changes };
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

  const totalDevices = devices.length;
  const devicesOn = devices.reduce((acc, d) => {
    if (d.type === 'switch' && d.state) return acc + 1;
    if (d.type === 'ac' && d.power) return acc + 1;
    return acc;
  }, 0);

  const iconFor = (d: Device) => (d.type === 'switch' ? 'bulb-outline' : 'snow-outline');

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
      {isWeb && <Header />}

      <View style={screenStyles.container}>
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

        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={devices}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingBottom: Spacing(16) }}
            renderItem={({ item }) => (item.type === 'switch' ? SwitchCard(item) : ACCard(item))}
          />
        )}
      </View>

      {!isWeb && (
        <View style={styles.bottomHeader}>
          <Header />
        </View>
      )}

      {/* Add/Edit modal */}
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

      {/* Temp/Humidity modal */}
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
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardWeb: {
    maxWidth: 600,
    alignSelf: 'center',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceName: {
    marginLeft: Spacing(3),
    fontFamily: Font.bold,
    fontSize: 24,
    color: Colors.textPrimary,
  },

  acCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius,
    padding: Spacing(4),
    marginHorizontal: Spacing(4),
    marginBottom: Spacing(3),
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  editIcon: {
    position: 'absolute',
    top: Spacing(4),
    right: Spacing(4),
  },
  tempRow: {
    marginTop: Spacing(3),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tempValue: {
    fontFamily: Font.bold,
    fontSize: 30,
    marginHorizontal: Spacing(4),
    color: Colors.textPrimary,
  },
  modeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing(4),
  },
  modeOption: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius,
    paddingVertical: Spacing(1),
    paddingHorizontal: Spacing(3),
    marginHorizontal: Spacing(2),
  },
  modeSelected: {
    backgroundColor: Colors.primary,
  },
  modeText: {
    fontFamily: Font.bold,
    fontSize: 18,
    color: Colors.primary,
  },
  modeTextSel: {
    color: Colors.surface,
  },
  powerRow: {
    marginTop: Spacing(4),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  powerLabel: {
    fontFamily: Font.bold,
    fontSize: 20,
    marginRight: Spacing(3),
    color: Colors.textPrimary,
  },

  bottomHeader: {
    width: '100%',
    maxWidth: 640,
    position: 'absolute',
    bottom: 0,
  },

  // Modal
  backdrop: {
    flex: 1,
    backgroundColor: '#000000AA',
    justifyContent: 'center',
    padding: Spacing(4),
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius,
    padding: Spacing(4),
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontFamily: Font.bold,
    fontSize: 28,
    color: Colors.textPrimary,
    marginBottom: Spacing(4),
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius,
    paddingHorizontal: Spacing(3),
    paddingVertical: Spacing(2),
    fontFamily: Font.regular,
    fontSize: 20,
    marginBottom: Spacing(4),
    color: Colors.textPrimary,
  },
  modalBtns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing(2),
    paddingHorizontal: Spacing(5),
    borderRadius: Radius,
  },
  saveTxt: {
    fontFamily: Font.bold,
    fontSize: 18,
    color: Colors.surface,
  },
  cancelBtn: {
    paddingVertical: Spacing(2),
    paddingHorizontal: Spacing(5),
    borderRadius: Radius,
  },
  cancelTxt: {
    fontFamily: Font.bold,
    fontSize: 18,
    color: Colors.primary,
  },
  delBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.error,
    paddingVertical: Spacing(2),
    paddingHorizontal: Spacing(4),
    borderRadius: Radius,
    alignItems: 'center',
  },
  delTxt: {
    fontFamily: Font.bold,
    fontSize: 18,
    color: Colors.surface,
    marginLeft: Spacing(2),
  },

  // Popup Temp/Humidity
  popupBackdrop: {
    flex: 1,
    backgroundColor: '#00000099',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing(4),
  },
  popupCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius,
    padding: Spacing(5),
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  popupCloseBtn: {
    position: 'absolute',
    top: Spacing(2),
    right: Spacing(2),
  },
  popupTitle: {
    fontFamily: Font.bold,
    fontSize: 28,
    marginBottom: Spacing(3),
    color: Colors.textPrimary,
  },
  popupText: {
    fontFamily: Font.regular,
    fontSize: 22,
    marginVertical: Spacing(1),
    color: Colors.textPrimary,
  },
});
