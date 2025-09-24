import React, { useState } from 'react';
import { SafeAreaView, View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constant/Api';
import { Colors, Spacing } from '../constant/Colors';

export default function AddRoomScreen({ route, navigation }: any) {
  const { homeId, homeName } = route.params || {};
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const createRoom = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Please enter a room name');
      return;
    }
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Not authenticated');
      const res = await fetch(`${API_URL}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim(), home_id: homeId }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(txt || 'Failed to create room');
      }
      Alert.alert('Success', 'Room created');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not create room');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: Spacing(4), backgroundColor: Colors.background }}>
      <View style={{ marginBottom: Spacing(2) }}>
        <Text style={{ fontSize: 28, fontFamily: 'Dongle-Bold', color: Colors.textPrimary }}>
          Add Room{homeName ? ` — ${homeName}` : ''}
        </Text>
      </View>

      <View style={{ backgroundColor: Colors.surface, padding: Spacing(3), borderRadius: 12, borderWidth: 1, borderColor: Colors.border }}>
        <Text style={{ marginBottom: Spacing(1), color: Colors.textSecondary }}>Room name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Living Room"
          placeholderTextColor="#888"
          style={{ backgroundColor: Colors.background, padding: Spacing(2), borderRadius: 8, borderWidth: 1, borderColor: Colors.border, color: Colors.textPrimary }}
        />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing(3) }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: Spacing(2), borderRadius: 8, backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.border }}>
            <Text style={{ color: Colors.textPrimary }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={createRoom} disabled={saving} style={{ padding: Spacing(2), borderRadius: 8, backgroundColor: Colors.primary }}>
            <Text style={{ color: Colors.surface }}>{saving ? 'Creating...' : 'Create'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
