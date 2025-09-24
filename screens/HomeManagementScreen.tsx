import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Colors, Spacing } from '../constant/Colors';
import LoadingOverlay from '../components/LoadingOverlay';
import { API_URL } from '../constant/Api';

type Home = { id: string; name: string };

export default function HomeManagementScreen() {
  const [homes, setHomes] = useState<Home[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newHomeName, setNewHomeName] = useState('');
  const [selectedHome, setSelectedHome] = useState<Home | null>(null);
  const [editHomeName, setEditHomeName] = useState('');

  useEffect(() => {
    refreshHomes();
  }, []);

  const refreshHomes = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      const res = await axios.get<Home[]>(`${API_URL}/homes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHomes(res.data || []);
    } catch (err) {
      console.error('Failed to fetch homes', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHome = async () => {
    if (!newHomeName.trim()) return Alert.alert('Error', 'Home name required');
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      await axios.post(
        `${API_URL}/homes`,
        { name: newHomeName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewHomeName('');
      setModalVisible(false);
      refreshHomes();
    } catch (err) {
      console.error('Failed to create home', err);
      Alert.alert('Error', 'Failed to create home');
    }
  };

  const handleEditHome = async () => {
    if (!editHomeName.trim() || !selectedHome) return;
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      await axios.put(
        `${API_URL}/homes/${selectedHome.id}`,
        { name: editHomeName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelectedHome(null);
      setEditHomeName('');
      refreshHomes();
    } catch (err) {
      console.error('Failed to edit home', err);
      Alert.alert('Error', 'Failed to edit home');
    }
  };

  const handleDeleteHome = async () => {
    if (!selectedHome) return;
    Alert.alert(
      'Delete Home',
      `Are you sure you want to delete "${selectedHome.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              if (!token) return;
              await axios.delete(`${API_URL}/homes/${selectedHome.id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              setSelectedHome(null);
              refreshHomes();
            } catch (err) {
              console.error('Failed to delete home', err);
              Alert.alert('Error', 'Failed to delete home');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.wrapper}>
      <LoadingOverlay visible={loading} text="Loading homes..." />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Manage Homes</Text>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add-outline" size={24} color={Colors.surface} />
          <Text style={styles.addButtonText}>Add Home</Text>
        </TouchableOpacity>

        {homes.map((home) => (
          <View key={home.id} style={styles.homeCard}>
            <Text style={styles.homeName}>{home.name}</Text>
            <View style={styles.homeActions}>
              <TouchableOpacity
                onPress={() => {
                  setSelectedHome(home);
                  setEditHomeName(home.name);
                }}
              >
                <Ionicons name="create-outline" size={20} color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setSelectedHome(home)}>
                <Ionicons name="trash-outline" size={20} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {homes.length === 0 && (
          <Text style={styles.emptyText}>No homes available.</Text>
        )}
      </ScrollView>

      {/* Add Home Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Home</Text>
            <TextInput
              style={styles.input}
              placeholder="Home Name"
              value={newHomeName}
              onChangeText={setNewHomeName}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleCreateHome}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit/Delete Home Modal */}
      <Modal visible={!!selectedHome} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Home</Text>
            <TextInput
              style={styles.input}
              placeholder="Home Name"
              value={editHomeName}
              onChangeText={setEditHomeName}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setSelectedHome(null)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleEditHome}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDeleteHome}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flexGrow: 1,
    padding: Spacing(4),
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: Spacing(4),
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    padding: Spacing(2),
    borderRadius: 8,
    marginBottom: Spacing(4),
  },
  addButtonText: {
    color: Colors.surface,
    marginLeft: Spacing(2),
  },
  homeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing(3),
    backgroundColor: Colors.surface,
    borderRadius: 8,
    marginBottom: Spacing(2),
  },
  homeName: {
    fontSize: 18,
    color: Colors.textPrimary,
  },
  homeActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginTop: Spacing(4),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    padding: Spacing(4),
    borderRadius: 8,
    width: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: Spacing(2),
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: Spacing(2),
    marginBottom: Spacing(4),
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    padding: Spacing(2),
    backgroundColor: Colors.border,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: Colors.textPrimary,
  },
  saveButton: {
    padding: Spacing(2),
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  saveButtonText: {
    color: Colors.surface,
  },
  deleteButton: {
    padding: Spacing(2),
    backgroundColor: '#FF3B30',
    borderRadius: 8,
  },
  deleteButtonText: {
    color: Colors.surface,
  },
});
