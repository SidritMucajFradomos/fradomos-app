import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Pressable,
  useColorScheme,
  FlatList,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Font, Spacing } from '../constant/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constant/Api';

const testHomes = [
  { id: 1, name: 'Main Home' },
  { id: 2, name: 'Lake House' },
  { id: 3, name: 'Office' },
];

type Role = 'Admin' | 'User';
interface AppUser { id: number; name: string; role: Role; email: string }
const testUsers: AppUser[] = [
  { id: 1, name: 'John Doe', role: 'User', email: 'john@example.com' },
  { id: 2, name: 'Jane Smith', role: 'Admin', email: 'jane@example.com' },
];

export default function UserManagementScreen() {
  // selected home and lists loaded from API (fallback to testHomes)
  const [homes, setHomes] = useState<{ id: number; name: string }[]>(testHomes);
  const [selectedHomeId, setSelectedHomeId] = useState<number>(testHomes[0].id);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [homesLoading, setHomesLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Grant-access modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [form, setForm] = useState({ name: '', email: '', role: 'User' as Role });
  const [error, setError] = useState('');

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);

  const scheme = useColorScheme();
  const C = useMemo(() => scheme === 'dark'
    ? { ...Colors, background: '#181A20', surface: '#23262F', textPrimary: '#fff', textSecondary: '#aaa', border: '#333', primary: '#4F8EF7', onPrimary: '#fff', error: '#E53935' }
    : { ...Colors, background: '#F7F8FA', surface: '#fff', textPrimary: '#181A20', textSecondary: '#6B7280', border: '#E5E7EB', primary: '#4F8EF7', onPrimary: '#fff', error: '#E53935' }
  , [scheme]);
  const styles = makeStyles(C);

  // --- Init: load homes, detect admin, load users for selected home ---
  const getTokenPayload = (token?: string | null) => {
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload;
    } catch {
      return null;
    }
  };

  const loadHomesFromApi = useCallback(async () => {
    setHomesLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Unauthenticated');
      const res = await fetch(`${API_URL.replace(/\/$/, '')}/homes`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to load homes');
      const data = await res.json();
      if (Array.isArray(data) && data.length) {
        setHomes(data.map((h: any) => ({ id: Number(h.id), name: h.name ?? h.title ?? String(h.id) })));
        return;
      }
    } catch (e) {
      // fallback to testHomes already present
      console.warn('loadHomes failed, using testHomes', e);
    } finally {
      setHomesLoading(false);
    }
  }, []);

  // Replace fetchUsersForHome to use the working accepted-users endpoint for the selected home
  const fetchUsersForHome = useCallback(async (homeIdParam: number) => {
    setUsersLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Unauthenticated');

      // Use the working endpoint: /home-invites/accepted-users/:homeId
      const baseUrl = API_URL.replace(/\/$/, '');
      const url = `${baseUrl}/home-invites/accepted-users/${encodeURIComponent(String(homeIdParam))}`;
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error('Failed to load users for home');
      const data = await res.json();
      if (Array.isArray(data)) {
        const mapped: AppUser[] = data.map((u: any, idx: number) => ({
          id: Number(u.id ?? u.user_id ?? idx),
          name: u.name || u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || 'User',
          role: (u.role && (u.role === 'Admin' || u.role === 'admin')) ? 'Admin' : 'User',
          email: u.email || u.user_email || u.invited_email || '',
        }));
        setUsers(mapped);
      } else {
        setUsers([]);
      }
    } catch (e) {
      console.warn('fetchUsersForHome error', e);
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  // small stable hash for fallback id generation
  const hashCode = (s: string) => s.split('').reduce((a, b) => (((a << 5) - a) + b.charCodeAt(0)) | 0, 0);

  useEffect(() => {
    (async () => {
      // detect admin from token payload or /users/me
      try {
        const token = await AsyncStorage.getItem('token');
        const payload = getTokenPayload(token);
        let roleFromToken = payload?.role || payload?.user?.role;
        let userId = payload?.userId || payload?.id || payload?.sub;
        if (!roleFromToken || !userId) {
          try {
            const res = await fetch(`${API_URL.replace(/\/$/, '')}/users/me`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
            if (res.ok) {
              const me = await res.json();
              roleFromToken = roleFromToken || me.role;
              userId = userId || me.id;
            }
          } catch {}
        }
        const adminCheck = String(roleFromToken).toLowerCase() === 'admin';
        console.log('Role from token:', roleFromToken, 'Is admin:', adminCheck);
        setIsAdmin(adminCheck);
      } catch {}

      await loadHomesFromApi();
    })();
  }, [loadHomesFromApi]);

  // When selected home changes, load its users
  useEffect(() => {
    if (selectedHomeId) fetchUsersForHome(selectedHomeId);
  }, [selectedHomeId, fetchUsersForHome]);

  // --- Handlers ---
  const openEditModal = (user: AppUser) => {
    setEditingUser(user);
    setForm({ name: user.name, email: user.email, role: user.role });
    setError('');
    setModalVisible(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.email.trim()) {
      setError('Name and email are required.');
      return;
    }
    if (editingUser) {
      setUsers(users.map(u => u.id === editingUser.id ? { ...editingUser, ...form } : u));
    } else {
      setUsers([...users, { id: Date.now(), ...form }]);
    }
    setModalVisible(false);
  };
  const handleDelete = (user: AppUser) => {
    Alert.alert('Delete User', `Remove ${user.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setUsers(users.filter(u => u.id !== user.id)) },
    ]);
  };
  const sendInvite = async () => {
    if (!inviteEmail.trim()) {
      setInviteMsg('Please enter an email');
      return;
    }
    setInviteLoading(true);
    setInviteMsg(null);
    try {
      const token = await AsyncStorage.getItem('token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const payload = { email: inviteEmail.trim(), role: 'member', home_id: selectedHomeId };
      const res = await fetch(`${API_URL.replace(/\/$/, '')}/home-invites`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(txt || 'Failed to send invite');
      }
      setInviteMsg('Invite sent!');
      setInviteEmail('');
    } catch (err: any) {
      setInviteMsg(err?.message || 'Failed to send invite');
    } finally {
      setInviteLoading(false);
    }
  };

  // --- UI ---
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>User Management</Text>
      </View>
      <Text style={styles.subtitle}>Manage users for your homes</Text>

      {/* Home Selector (loaded from API, fallback to testHomes) */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.homeRow}>
        {(homes.length ? homes : testHomes).map(home => (
          <TouchableOpacity
            key={home.id}
            style={[styles.homeChip, selectedHomeId === Number(home.id) && styles.homeChipSelected]}
            onPress={() => setSelectedHomeId(Number(home.id))}
          >
            <Ionicons name="home-outline" size={16} color={selectedHomeId === Number(home.id) ? C.onPrimary : C.primary} />
            <Text style={[styles.homeChipText, selectedHomeId === Number(home.id) && styles.homeChipTextSelected]}>{home.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Invite input box (temporarily always show for testing) */}
      {/* {isAdmin && ( */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing(2) }}>
          <TextInput
            value={inviteEmail}
            onChangeText={setInviteEmail}
            placeholder="Enter email to invite"
            placeholderTextColor={C.textSecondary}
            style={[styles.input, { flex: 1 }]}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!inviteLoading}
          />
          <TouchableOpacity
            onPress={sendInvite}
            style={[styles.saveBtn, { paddingVertical: 10, paddingHorizontal: 12, marginLeft: Spacing(1) }]}
            disabled={inviteLoading}
          >
            <Text style={{ color: C.onPrimary }}>{inviteLoading ? 'Sending...' : 'Send Invite'}</Text>
          </TouchableOpacity>
        </View>
      {/* )} */}
      {inviteMsg ? (
        <Text style={{ color: inviteMsg.includes('sent') ? '#2E7D32' : C.error, marginBottom: Spacing(1), marginLeft: 2 }}>
          {inviteMsg}
        </Text>
      ) : null}

      {/* User List for selected home */}
      {usersLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={u => u.id.toString()}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: Spacing(8) }}
          renderItem={({ item }) => (
            <View style={styles.userCard}>
              <View style={styles.avatar}>
                <Image
                  source={{ uri: `${API_URL.replace(/\/$/, '')}/users/${item.id}/profile-image` }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.userName}>{item.name}</Text>
                <Text style={styles.userEmail}>{item.email}</Text>
                <View style={styles.roleBadge}>
                  <Ionicons name={item.role === 'Admin' ? 'shield-checkmark' : 'person'} size={14} color={C.primary} />
                  <Text style={styles.roleBadgeText}>{item.role}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.iconBtn} onPress={() => openEditModal(item)}>
                <Ionicons name="ellipsis-vertical" size={22} color={C.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(item)}>
                <Ionicons name="trash" size={22} color={C.error} />
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No users found for this home.</Text>}
        />
      )}

      {/* Add/Edit Modal (now only for editing) */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setModalVisible(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editingUser ? 'Edit User' : 'Add User'}</Text>
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              value={form.name}
              onChangeText={name => setForm(f => ({ ...f, name }))}
              placeholderTextColor={C.textSecondary}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={form.email}
              onChangeText={email => setForm(f => ({ ...f, email }))}
              placeholderTextColor={C.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <View style={styles.segmented}>
              {(['User', 'Admin'] as Role[]).map(r => (
                <TouchableOpacity
                  key={r}
                  style={[styles.segmentBtn, form.role === r && styles.segmentBtnSelected]}
                  onPress={() => setForm(f => ({ ...f, role: r }))}
                >
                  <Text style={[styles.segmentText, form.role === r && styles.segmentTextSelected]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={handleSave}>
                <Text style={[styles.modalBtnText, { color: C.onPrimary }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(C: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background, padding: Spacing(3) },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing(1) },
    title: { fontSize: 28, fontFamily: Font.bold, color: C.textPrimary },
    subtitle: { fontSize: 16, color: C.textSecondary, marginBottom: Spacing(2) },
    fab: { backgroundColor: C.primary, borderRadius: 24, padding: 12, elevation: 2 },
    fabSecondary: { backgroundColor: C.surface, borderRadius: 20, padding: 10, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },
    homeRow: { maxHeight: 56, marginBottom: Spacing(2) },
    homeChip: {
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: Spacing(1), paddingHorizontal: Spacing(2),
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
      borderRadius: 20, marginRight: Spacing(1.5),
    },
    homeChipSelected: { backgroundColor: C.primary, borderColor: C.primary },
    homeChipText: { marginLeft: Spacing(1), color: C.primary, fontFamily: Font.bold, fontSize: 14 },
    homeChipTextSelected: { color: C.onPrimary },
    userCard: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: C.surface, borderRadius: 14, padding: Spacing(2.5),
      borderWidth: 1, borderColor: C.border, marginBottom: Spacing(2),
      shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    },
    avatar: {
      width: 44, height: 44, borderRadius: 22, backgroundColor: C.primary + '22',
      alignItems: 'center', justifyContent: 'center', marginRight: Spacing(2),
    },
    avatarImage: { width: 44, height: 44, borderRadius: 22 },
    userName: { fontFamily: Font.bold, fontSize: 18, color: C.textPrimary },
    userEmail: { fontFamily: Font.regular, fontSize: 13, color: C.textSecondary, marginBottom: 2 },
    roleBadge: {
      flexDirection: 'row', alignItems: 'center',
      alignSelf: 'flex-start', paddingVertical: 2, paddingHorizontal: 8,
      borderRadius: 20, borderWidth: 1, borderColor: C.primary, backgroundColor: C.background, marginTop: 2,
    },
    roleBadgeText: { marginLeft: 4, color: C.primary, fontFamily: Font.bold, fontSize: 12 },
    iconBtn: { padding: Spacing(1), marginLeft: Spacing(1) },
    emptyText: { textAlign: 'center', color: C.textSecondary, marginTop: Spacing(4) },
    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: Spacing(3) },
    modalCard: { width: '92%', backgroundColor: C.surface, borderRadius: 16, padding: Spacing(3), borderWidth: 1, borderColor: C.border },
    modalTitle: { fontFamily: Font.bold, fontSize: 24, color: C.textPrimary, marginBottom: Spacing(2) },
    input: {
      backgroundColor: C.background, borderRadius: 10, borderWidth: 1, borderColor: C.border,
      paddingVertical: Spacing(1.5), paddingHorizontal: Spacing(2), fontFamily: Font.regular, fontSize: 16, color: C.textPrimary, marginBottom: Spacing(1.5),
    },
    segmented: {
      flexDirection: 'row', backgroundColor: C.background, borderRadius: 12, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: Spacing(2),
    },
    segmentBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing(1.2) },
    segmentBtnSelected: { backgroundColor: C.primary },
    segmentText: { fontFamily: Font.bold, fontSize: 16, color: C.textPrimary },
    segmentTextSelected: { color: C.onPrimary },
    errorText: { color: C.error, fontFamily: Font.regular, fontSize: 13, marginBottom: Spacing(1) },
    modalBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: Spacing(2) },
    modalBtn: { paddingVertical: Spacing(1.2), paddingHorizontal: Spacing(2.5), borderRadius: 10, marginLeft: Spacing(1.5) },
    cancelBtn: { backgroundColor: C.background, borderWidth: 1, borderColor: C.border },
    saveBtn: { backgroundColor: C.primary },
    modalBtnText: { fontFamily: Font.bold, fontSize: 16, color: C.textPrimary },
  });
}

