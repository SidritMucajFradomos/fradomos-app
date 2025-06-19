// HomesScreen.tsx – List of all homes (responsive for web)
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
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../constant/Colors';
import { RootStackParamList } from '../navigation/AppNavigator';

const MAX_WIDTH = 640;

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Homes'>;
type Home = { id: string; name: string };

const initialHomes: Home[] = [
  { id: '1', name: 'Main House' },
  { id: '2', name: 'Vacation Villa' },
];

export default function HomesScreen({ navigation }: { navigation: NavProp }) {
  const [homes, setHomes] = useState<Home[]>(initialHomes);
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');

  const addHome = () => {
    if (!newName.trim()) return Alert.alert('Please enter a name');
    const newHome = { id: Date.now().toString(), name: newName.trim() };
    setHomes((prev) => [...prev, newHome]);
    setModalVisible(false);
    setNewName('');
  };

  const renderHome = ({ item }: { item: Home }) => (
    <TouchableOpacity
      style={[styles.card, Platform.OS === 'web' && styles.cardWeb]}
      onPress={() => navigation.navigate('Home', { homeName: item.name })}
    >
      <Ionicons name="home-outline" size={32} color={Colors.primary} />
      <Text style={styles.homeName}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.screenWrapper}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>My Homes</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Ionicons name="add-circle-outline" size={28} color={Colors.primary} />
            <Text style={styles.addTxt}>Add Home</Text>
          </TouchableOpacity>
        </View>

        {/* Homes list */}
        <FlatList
          data={homes}
          keyExtractor={(h) => h.id}
          contentContainerStyle={{ paddingBottom: Spacing(8) }}
          renderItem={renderHome}
        />
      </View>

      {/* Add Home modal */}
      <Modal transparent animationType="slide" visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.backdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Home</Text>
            <TextInput
              placeholder="Home Name"
              placeholderTextColor="#888"
              value={newName}
              onChangeText={setNewName}
              style={styles.input}
            />
            <View style={styles.modalRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={addHome}>
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
  /* Responsive wrapper */
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

  /* Header */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing(4),
    marginTop: Spacing(6),
    marginBottom: Spacing(2),
  },
  title: {
    fontFamily: 'Dongle-Bold',
    fontSize: 48,
    color: Colors.textPrimary,
  },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing(1) },
  addTxt: {
    fontFamily: 'Dongle-Regular',
    fontSize: 24,
    color: Colors.primary,
    marginLeft: Spacing(1),
  },

  /* Card */
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing(4),
    marginHorizontal: Spacing(4),
    marginBottom: Spacing(3),
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing(3),
    elevation: 2,
  },
  cardWeb: {
    cursor: 'pointer',
    transitionDuration: '150ms',
    transitionProperty: 'transform',
  } as any,
  homeName: {
    fontFamily: 'Dongle-Regular',
    fontSize: 36,
    color: Colors.textPrimary,
  },

  /* Modal */
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '80%',
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
    gap: Spacing(2),
    alignItems: 'center',
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
});
