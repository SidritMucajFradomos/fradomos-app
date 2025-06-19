// HomeScreen.tsx – Rooms inside a single home
import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
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
import { RootStackParamList } from '../navigation/AppNavigator';

const MAX_WIDTH = 640;

type HomeRouteProp = RouteProp<RootStackParamList, 'Home'>;
type HomeNavProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

type Room = { id: string; name: string };

const initialRooms: Record<string, Room[]> = {
  'Main House': [
    { id: 'r1', name: 'Living Room' },
    { id: 'r2', name: 'Kitchen' },
  ],
  'Vacation Villa': [{ id: 'r1', name: 'Master Bedroom' }],
};

export default function HomeScreen({
  route,
  navigation,
}: {
  route: HomeRouteProp;
  navigation: HomeNavProp;
}) {
  const { homeName } = route.params;
  const [rooms, setRooms] = useState<Room[]>(initialRooms[homeName] ?? []);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);
  const [roomName, setRoomName] = useState('');

  const openAdd = () => {
    setEditing(null);
    setRoomName('');
    setModalVisible(true);
  };

  const openEdit = (room: Room) => {
    setEditing(room);
    setRoomName(room.name);
    setModalVisible(true);
  };

  const saveRoom = () => {
    if (!roomName.trim()) return Alert.alert('Name required');

    if (editing) {
      setRooms((prev) => prev.map((r) => (r.id === editing.id ? { ...r, name: roomName.trim() } : r)));
    } else {
      const id = Date.now().toString();
      setRooms((prev) => [...prev, { id, name: roomName.trim() }]);
    }
    setModalVisible(false);
  };

  const deleteRoom = () => {
    if (!editing) return;
    setRooms((prev) => prev.filter((r) => r.id !== editing.id));
    setModalVisible(false);
  };

  const renderRoom = ({ item }: { item: Room }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('Room', { name: item.name })}
    >
      <View style={styles.cardLeft}>
        <Ionicons name="grid-outline" size={28} color={Colors.primary} />
        <Text style={styles.roomName}>{item.name}</Text>
      </View>
      <TouchableOpacity onPress={() => openEdit(item)}>
        <Ionicons name="pencil-outline" size={20} color={Colors.textSecondary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.screenWrapper}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={28} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>{homeName}</Text>
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <Ionicons name="add-circle-outline" size={28} color={Colors.primary} />
            <Text style={styles.addTxt}>Add Room</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={rooms}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ paddingBottom: Spacing(8) }}
          renderItem={renderRoom}
        />
      </View>

      <Modal transparent animationType="slide" visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.backdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Room' : 'Add Room'}</Text>
            <TextInput
              placeholder="Room Name"
              placeholderTextColor="#888"
              value={roomName}
              onChangeText={setRoomName}
              style={styles.input}
            />
            <View style={styles.modalRow}>
              {editing && (
                <TouchableOpacity style={styles.delBtn} onPress={deleteRoom}>
                  <Ionicons name="trash-outline" size={20} color="#fff" />
                  <Text style={styles.delTxt}>Delete</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveRoom}>
                <Text style={styles.saveTxt}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing(4),
    marginTop: Spacing(6),
    marginBottom: Spacing(2),
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Dongle-Bold',
    fontSize: 48,
    color: Colors.textPrimary,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing(1),
  },
  addTxt: {
    fontFamily: 'Dongle-Regular',
    fontSize: 24,
    color: Colors.primary,
    marginLeft: Spacing(1),
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing(4),
    marginHorizontal: Spacing(4),
    marginBottom: Spacing(3),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing(3),
  },
  roomName: {
    fontFamily: 'Dongle-Regular',
    fontSize: 36,
    color: Colors.textPrimary,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '85%',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing(6),
    gap: Spacing(4),
  },
  modalTitle: {
    fontFamily: 'Dongle-Bold',
    fontSize: 40,
    textAlign: 'center',
    color: Colors.textPrimary,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingVertical: Spacing(2),
    paddingHorizontal: Spacing(3),
    fontFamily: 'Dongle-Regular',
    fontSize: 28,
    color: Colors.textPrimary,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing(2),
    flexWrap: 'nowrap',
  },
  cancelBtn: {
    backgroundColor: '#e2e8f0',
    paddingVertical: Spacing(2),
    paddingHorizontal: Spacing(4),
    borderRadius: 8,
  },
  cancelTxt: {
    fontFamily: 'Dongle-Regular',
    fontSize: 28,
    color: Colors.textPrimary,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing(2),
    paddingHorizontal: Spacing(4),
    borderRadius: 8,
  },
  saveTxt: {
    fontFamily: 'Dongle-Bold',
    fontSize: 28,
    color: Colors.surface,
  },
  delBtn: {
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing(1),
    paddingVertical: Spacing(2),
    paddingHorizontal: Spacing(4),
    borderRadius: 8,
  },
  delTxt: {
    fontFamily: 'Dongle-Bold',
    fontSize: 28,
    color: '#fff',
  },
});
