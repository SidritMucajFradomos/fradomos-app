import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Colors, Font, Spacing } from '../constant/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
// @ts-ignore
import * as ImagePicker from 'expo-image-picker';
import { API_URL } from '../constant/Api';

export default function AccountManagementScreen() {
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // fetch current user by parsing token payload (like ProfileScreen) and probe profile image
  const loadCurrentUser = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      // parse JWT payload to get user id (matches ProfileScreen approach)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.userId || payload.id || payload.sub;
      if (!userId) {
        throw new Error('Could not determine user id from token');
      }

      const headers = await getAuthHeaders();
      const res = await axios.get(`${API_URL}/users/${userId}`, { headers });
      // set base user data
      setSelected(res.data);

      // probe profile image endpoint; set __remoteImage if exists (cache-busted)
      try {
        const imgUrl = `${API_URL}/users/${userId}/profile-image`;
        await axios.get(imgUrl, { responseType: 'arraybuffer', headers });
        setSelected((s: any) => ({ ...(s || {}), __remoteImage: imgUrl + `?t=${Date.now()}` }));
      } catch {
        setSelected((s: any) => ({ ...(s || {}), __remoteImage: undefined }));
      }
    } catch (e) {
      console.error('Load current user error', e);
      Alert.alert('Error', 'Failed to load your account data');
    } finally {
      setLoading(false);
    }
  };

  const saveUserEdits = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      await axios.put(`${API_URL}/users/${selected.id}`,
        {
          name: selected.name,
          lastname: selected.lastname,
          email: selected.email,
          phone_nr: selected.phone_nr,
          role: selected.role,
        },
        { headers }
      );
      Alert.alert('Success', 'User updated');
      await loadCurrentUser();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const pickImage = async () => {
    if (!selected) return;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission required', 'Please grant gallery permission to pick an image');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
      });
      // handle both old and new response shapes
      if ((res as any).cancelled) return;
      if ((res as any).canceled) {
        if ((res as any).canceled === true) return;
      }
      const uri = (res as any).uri || ((res as any).assets && (res as any).assets[0] && (res as any).assets[0].uri);
      if (!uri) return;
      setSelected({ ...selected, __localImage: uri });
    } catch (e) {
      console.error(e);
    }
  };

  const uploadProfileImage = async () => {
    if (!selected || !selected.__localImage) {
      Alert.alert('No image', 'Pick an image first');
      return;
    }
    setUploading(true);
    try {
      const headers = await getAuthHeaders();
      const uri = selected.__localImage;
      const form = new FormData();
      const filename = uri.split('/').pop() || `photo.${Platform.OS === 'ios' ? 'jpg' : 'jpg'}`;
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      // @ts-ignore - RN FormData file object
      form.append('profile_image', { uri, name: filename, type });

      await axios.put(`${API_URL}/users/${selected.id}/profile-image`, form, {
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data',
        },
      });

      Alert.alert('Success', 'Profile image uploaded');
      setSelected((s: any) => ({ ...s, __localImage: undefined }));
      await loadCurrentUser();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const removeProfileImage = async () => {
    if (!selected) return;
    setUploading(true);
    try {
      const headers = await getAuthHeaders();
      await axios.delete(`${API_URL}/users/${selected.id}/profile-image`, { headers });
      Alert.alert('Success', 'Profile image removed');
      await loadCurrentUser();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to remove image');
    } finally {
      setUploading(false);
    }
  };

  const deleteUser = async () => {
    if (!selected) return;
    Alert.alert('Confirm', 'Delete your account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const headers = await getAuthHeaders();
            await axios.delete(`${API_URL}/users/${selected.id}`, { headers });
            Alert.alert('Deleted', 'Account removed');
            setSelected(null);
            // optionally: clear auth token or navigate to login (not implemented here)
          } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to delete user');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Account Management</Text>
      <Text style={styles.subtitle}>Edit your account details and profile image.</Text>

      {loading ? <ActivityIndicator style={{ marginTop: Spacing(3) }} /> : null}

      {selected && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Edit your account — {selected.username || selected.email}</Text>

          <View style={styles.row}>
            <Text style={styles.label}>First name</Text>
            <TextInput value={selected.name} onChangeText={(t) => setSelected({ ...selected, name: t })} style={styles.input} />
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Last name</Text>
            <TextInput value={selected.lastname} onChangeText={(t) => setSelected({ ...selected, lastname: t })} style={styles.input} />
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Email</Text>
            <TextInput value={selected.email} onChangeText={(t) => setSelected({ ...selected, email: t })} style={styles.input} keyboardType="email-address" autoCapitalize="none" />
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Phone</Text>
            <TextInput value={selected.phone_nr} onChangeText={(t) => setSelected({ ...selected, phone_nr: t })} style={styles.input} keyboardType="phone-pad" />
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Role</Text>
            <TextInput value={selected.role || ''} onChangeText={(t) => setSelected({ ...selected, role: t })} style={styles.input} />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: Spacing(2) }}>
            <View style={styles.imagePreview}>
              {selected.__localImage ? (
                <Image source={{ uri: selected.__localImage }} style={styles.previewImg} />
              ) : selected.__remoteImage ? (
                <Image source={{ uri: selected.__remoteImage }} style={styles.previewImg} onError={() => { /* ignore */ }} />
              ) : (
                // no image available — render empty container
                <View style={{ width: '100%', height: '100%' }} />
              )}
            </View>

            <View style={{ marginLeft: Spacing(2) }}>
              <TouchableOpacity style={styles.btn} onPress={pickImage}>
                <Text style={styles.btnText}>Pick Image</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.btn, { marginTop: Spacing(1) }]} onPress={uploadProfileImage} disabled={uploading}>
                <Text style={styles.btnText}>{uploading ? 'Uploading...' : 'Upload/Replace'}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.btn, { marginTop: Spacing(1), backgroundColor: '#FDEDEC', borderColor: '#FF3B30' }]} onPress={removeProfileImage} disabled={uploading}>
                <Text style={{ color: '#FF3B30' }}>Remove Image</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ flexDirection: 'row', marginTop: Spacing(3), justifyContent: 'space-between' }}>
            <TouchableOpacity style={[styles.btn, { backgroundColor: Colors.primary }]} onPress={saveUserEdits} disabled={saving}>
              <Text style={styles.btnText}>{saving ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btn, { backgroundColor: '#FDEDEC', borderColor: '#FF3B30' }]} onPress={deleteUser}>
              <Text style={{ color: '#FF3B30' }}>Delete Account</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btn, { backgroundColor: Colors.background }]} onPress={() => setSelected(null)}>
              <Text style={{ color: Colors.textPrimary }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing(3) },
  title: { fontSize: 28, fontFamily: Font.bold, color: Colors.textPrimary, marginBottom: Spacing(2) },
  subtitle: { fontSize: 16, color: Colors.textSecondary, textAlign: 'left' },
  card: { marginTop: Spacing(3), backgroundColor: Colors.surface, padding: Spacing(3), borderRadius: 8, borderWidth: 1, borderColor: Colors.border },
  cardTitle: { fontSize: 20, fontFamily: Font.bold, color: Colors.textPrimary, marginBottom: Spacing(2) },
  row: { marginBottom: Spacing(2) },
  label: { fontSize: 14, color: Colors.textSecondary, marginBottom: Spacing(1) },
  input: { backgroundColor: Colors.background, padding: Spacing(1.5), borderRadius: 6, borderWidth: 1, borderColor: Colors.border, color: Colors.textPrimary },
  imagePreview: { width: 80, height: 80, borderRadius: 8, overflow: 'hidden', backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  previewImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  btn: { paddingHorizontal: Spacing(3), paddingVertical: Spacing(1), borderRadius: 8, backgroundColor: Colors.primary, borderColor: Colors.primary, borderWidth: 1 },
  btnText: { color: Colors.surface, fontFamily: Font.bold },
});
