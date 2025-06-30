import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../constant/Colors';
import { useNavigation } from '@react-navigation/native';

const API_URL = 'http://api.fradomos.al:3000';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
  });

  const [editMode, setEditMode] = useState(false);
  const [homes, setHomes] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const fetchUserData = async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userId = payload.userId;

        const res = await axios.get(`${API_URL}/users/${userId}`);
        setForm({
          first_name: res.data.first_name || '',
          last_name: res.data.last_name || '',
          email: res.data.email || '',
          phone_number: res.data.phone_number || '',
        });

        const homesRes = await axios.get(`${API_URL}/homes`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setHomes(homesRes.data || []);
      } catch (err) {
        console.error('Fetch profile error:', err);
        Alert.alert('Error', 'Failed to load profile data');
      }
    };

    fetchUserData();
  }, []);

  const handleSave = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const payload = JSON.parse(atob(token!.split('.')[1]));
      const userId = payload.userId;

      await axios.put(`${API_URL}/users/${userId}`, form);
      Alert.alert('Success', 'Profile updated');
      setEditMode(false);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  const handleChange = (field: string, value: string) => {
    setForm({ ...form, [field]: value });
  };

  const renderField = (label: string, field: keyof typeof form) => (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={form[field]}
        onChangeText={(text) => handleChange(field, text)}
        editable={editMode}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.wrapper}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>My Profile</Text>

        {/* Summary Card */}
        <View style={styles.card}>
          <TouchableOpacity style={styles.editIcon} onPress={() => setEditMode(!editMode)}>
            <Ionicons name={editMode ? 'close-outline' : 'create-outline'} size={28} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.cardItem}><Text style={styles.cardLabel}>First Name:</Text> {form.first_name}</Text>
          <Text style={styles.cardItem}><Text style={styles.cardLabel}>Last Name:</Text> {form.last_name}</Text>
          <Text style={styles.cardItem}><Text style={styles.cardLabel}>Email:</Text> {form.email}</Text>
          <Text style={styles.cardItem}><Text style={styles.cardLabel}>Phone:</Text> {form.phone_number}</Text>
        </View>

        {/* Editable Fields */}
        {editMode && (
          <>
            {renderField('First Name', 'first_name')}
            {renderField('Last Name', 'last_name')}
            {renderField('Email', 'email')}
            {renderField('Phone Number', 'phone_number')}
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveTxt}>Save Changes</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Homes Card */}
        <View style={styles.card}>
          <Text style={styles.cardItem}>
            <Text style={styles.cardLabel}>Total Homes:</Text> {homes.length}
          </Text>
          {homes.map((home) => (
            <Text key={home.id} style={styles.cardItem}>🏠 {home.name}</Text>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={[styles.saveBtn, styles.logoutBtn]} onPress={handleLogout}>
          <Text style={styles.saveTxt}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
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
    padding: Spacing(5),
    maxWidth: 640,
    alignSelf: 'center',
  },
  title: {
    fontFamily: 'Dongle-Bold',
    fontSize: 52,
    textAlign: 'center',
    marginBottom: Spacing(4),
    color: Colors.textPrimary,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing(4),
    marginBottom: Spacing(6),
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    position: 'relative',
  },
  editIcon: {
    position: 'absolute',
    top: Spacing(2),
    right: Spacing(2),
    zIndex: 1,
  },
  cardItem: {
    fontFamily: 'Dongle-Regular',
    fontSize: 30,
    marginBottom: Spacing(2),
    color: Colors.textPrimary,
  },
  cardLabel: {
    fontFamily: 'Dongle-Bold',
    color: Colors.primary,
  },
  row: {
    marginBottom: Spacing(3),
  },
  label: {
    fontFamily: 'Dongle-Bold',
    fontSize: 28,
    color: Colors.textSecondary,
    marginBottom: Spacing(1),
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingVertical: Spacing(2),
    paddingHorizontal: Spacing(3),
    fontSize: 24,
    backgroundColor: Colors.surface,
    fontFamily: 'Dongle-Regular',
    color: Colors.textPrimary,
  },
  saveBtn: {
    marginTop: Spacing(4),
    alignSelf: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing(6),
    paddingVertical: Spacing(2),
    borderRadius: 8,
  },
  logoutBtn: {
    backgroundColor: '#FF3B30', // red for logout
  },
  saveTxt: {
    color: Colors.surface,
    fontSize: 26,
    fontFamily: 'Dongle-Bold',
  },
});
