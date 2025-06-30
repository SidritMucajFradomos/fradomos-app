import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, Platform, UIManager, LayoutAnimation,
  Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing } from '../constant/Colors';

type User = { id: string; first_name: string; last_name: string; email: string; };
type House = { id: string; name: string; };

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const API_URL = 'http://api.fradomos.al:3000';

export default function UserManagementScreen() {
  const [houses, setHouses] = useState<House[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [membersMap, setMembersMap] = useState<Record<string, User[]>>({});
  const [usersByEmail, setUsersByEmail] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(false);

  const [expandedHouses, setExpandedHouses] = useState<Set<string>>(new Set());
  const [emailInput, setEmailInput] = useState('');
  const [selectedHouse, setSelectedHouse] = useState<string | null>(null);

  const getToken = async () => await AsyncStorage.getItem('token');

  async function load() {
    setLoading(true);
    try {
      const t = await getToken();
      if (!t) throw new Error('Log in first');
      const hdr = { headers: { Authorization: `Bearer ${t}` } };

      const [homesRes, invitesRes, usersRes] = await Promise.all([
        fetch(`${API_URL}/homes`, hdr),
        fetch(`${API_URL}/home-invites`, hdr),
        fetch(`${API_URL}/users`, hdr),
      ]);
      if (!homesRes.ok || !invitesRes.ok || !usersRes.ok) throw new Error('Data error');
      const [homesData, invitesData, usersData]: [House[], any[], User[]] = await Promise.all([
        homesRes.json(), invitesRes.json(), usersRes.json()
      ]);

      setHouses(homesData);
      setInvites(invitesData);
      setUsersByEmail(Object.fromEntries(usersData.map(u => [u.email.toLowerCase(), u])));

      const membs: Record<string, User[]> = {};
      invitesData
        .filter(i => i.status === 'accepted')
        .forEach(i => {
          const u = usersData.find(u2 => u2.id === i.invitee_id);
          if (u) membs[i.home_id]?.push(u) || (membs[i.home_id] = [u]);
        });
      setMembersMap(membs);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const toggleHouse = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const s = new Set(expandedHouses);
    s.has(id) ? s.delete(id) : s.add(id);
    setExpandedHouses(s);
  };

  const inviteUser = async () => {
    if (!selectedHouse || !emailInput.trim()) return Alert.alert('Select house & enter email');
    const u = usersByEmail[emailInput.toLowerCase()];
    if (!u) return Alert.alert('User not found');

    try {
      const t = await getToken();
      const res = await fetch(`${API_URL}/home-invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({
          home_id: selectedHouse,
          invited_by: JSON.parse(atob((t as string).split('.')[1])).userId,
          invitee_id: u.id
        })
      });
      if (!res.ok) throw new Error('Invite failed');
      Alert.alert('Invite sent');
      setEmailInput('');
      setSelectedHouse(null);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  if (loading) return (
    <SafeAreaView style={[styles.wrapper, { justifyContent: 'center' }]}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.wrapper}>
      <View style={styles.addUserCard}>
        <Text style={styles.addUserTitle}>Invite User to House</Text>
        <TextInput
          style={styles.input}
          placeholder="User email"
          value={emailInput}
          onChangeText={setEmailInput}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <View style={styles.houseSelector}>
          {houses.map(h => (
            <TouchableOpacity
              key={h.id}
              onPress={() => setSelectedHouse(h.id)}
              style={[styles.houseOption, selectedHouse === h.id && styles.houseOptionSelected]}
            >
              <Text style={[styles.houseOptionText, selectedHouse === h.id && styles.houseOptionTextSelected]}>
                {h.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.addUserBtn} onPress={inviteUser}>
          <Text style={styles.addUserBtnText}>Send Invite</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        style={{ paddingBottom: Spacing(8) }}
        data={houses}
        keyExtractor={h => h.id}
        renderItem={({ item: h }) => {
          const exp = expandedHouses.has(h.id);
          const members = membersMap[h.id] || [];
          return (
            <View style={styles.houseSection}>
              <TouchableOpacity style={styles.houseHeader} onPress={() => toggleHouse(h.id)}>
                <Text style={styles.houseTitle}>{h.name}</Text>
                <Ionicons name={exp ? 'chevron-up-outline' : 'chevron-down-outline'} size={28} color={Colors.primary}/>
              </TouchableOpacity>
              {exp && members.length === 0 && <Text style={{ margin: Spacing(3) }}>No accepted members yet.</Text>}
              {exp && members.map(u => (
                <View key={u.id} style={styles.userCard}>
                  <Text style={styles.userName}>{u.first_name} {u.last_name}</Text>
                  <Text style={styles.userEmail}>{u.email}</Text>
                </View>
              ))}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    padding: Spacing(5),
    paddingTop: Spacing(6),
    maxWidth: 640,
    paddingBottom: 150,
    alignSelf: 'center',
  },
  houseSection: {
    marginBottom: Spacing(5),
    marginLeft: Spacing(5),
    marginRight: Spacing(5),
  },
  houseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing(4),
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  houseTitle: {
    fontFamily: 'Dongle-Bold',
    fontSize: 30,
    color: Colors.primary,
  },
  userCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: Spacing(4),
    marginTop: Spacing(3),
    position: 'relative',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  editBtn: {
    position: 'absolute',
    top: Spacing(2),
    right: Spacing(2),
  },
  userName: {
    fontFamily: 'Dongle-Bold',
    fontSize: 22,
    color: Colors.textPrimary,
  },
  userEmail: {
    fontFamily: 'Dongle-Regular',
    fontSize: 18,
    color: Colors.textSecondary,
    marginTop: Spacing(1),
  },
  addUserCard: {
    backgroundColor: '#E6F2FF',
    padding: Spacing(6),
    borderRadius: 16,
    margin: Spacing(5),
    marginTop: Spacing(15),
    borderWidth: 1,
    borderColor: Colors.primary + '55',
  },
  addUserTitle: {
    fontFamily: 'Dongle-Bold',
    fontSize: 34,
    color: Colors.primary,
    marginBottom: Spacing(4),
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: Spacing(3),
    paddingHorizontal: Spacing(4),
    fontSize: 20,
    backgroundColor: Colors.surface,
    fontFamily: 'Dongle-Regular',
    color: Colors.textPrimary,
    marginBottom: Spacing(4),
  },
  houseSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: Spacing(4),
  },
  houseOption: {
    borderWidth: 1,
    borderColor: Colors.primary + '88',
    borderRadius: 20,
    paddingVertical: Spacing(2),
    paddingHorizontal: Spacing(5),
    marginHorizontal: Spacing(1),
    marginBottom: Spacing(2),
    backgroundColor: 'transparent',
  },
  houseOptionSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  houseOptionText: {
    fontFamily: 'Dongle-Bold',
    fontSize: 18,
    color: Colors.primary,
  },
  houseOptionTextSelected: {
    color: Colors.surface,
  },
  addUserBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing(3),
    borderRadius: 12,
    alignItems: 'center',
  },
  addUserBtnText: {
    color: Colors.surface,
    fontSize: 26,
    fontFamily: 'Dongle-Bold',
  },
});
