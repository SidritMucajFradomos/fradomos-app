import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Platform,
  UIManager,
  LayoutAnimation,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing } from '../constant/Colors';

type User = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
};

type House = {
  id: string;
  name: string;
  users: User[];
};

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const API_URL = 'http://api.fradomos.al:3000';

export default function UserManagementScreen() {
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedHouses, setExpandedHouses] = useState<Set<string>>(new Set());
  const [emailInput, setEmailInput] = useState('');
  const [selectedHouse, setSelectedHouse] = useState<string | null>(null);

  const getToken = async () => {
    return await AsyncStorage.getItem('token');
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        Alert.alert('Error', 'You must be logged in');
        setLoading(false);
        return;
      }

      // Fetch homes
      const homesRes = await fetch(`${API_URL}/homes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!homesRes.ok) throw new Error('Failed to fetch homes');
      const homesData: { id: string; name: string }[] = await homesRes.json();

      // Fetch home-members
      const membersRes = await fetch(`${API_URL}/home-members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!membersRes.ok) throw new Error('Failed to fetch home members');
      const membersData: { home_id: string; user_id: string }[] = await membersRes.json();

      // Fetch all users
      const usersRes = await fetch(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!usersRes.ok) throw new Error('Failed to fetch users');
      const usersData: User[] = await usersRes.json();

      // Map users by ID for quick lookup
      const usersById: Record<string, User> = {};
      usersData.forEach((user) => {
        usersById[user.id] = user;
      });

      // Group users by home_id
      const homeUsersMap: Record<string, User[]> = {};
      membersData.forEach(({ home_id, user_id }) => {
        if (!homeUsersMap[home_id]) homeUsersMap[home_id] = [];
        const user = usersById[user_id];
        if (user) {
          homeUsersMap[home_id].push(user);
        }
      });

      // Merge users into homes
      const homesWithUsers: House[] = homesData.map((home) => ({
        ...home,
        users: homeUsersMap[home.id] || [],
      }));

      setHouses(homesWithUsers);
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleHouse = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedHouses((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const handleAddUser = () => {
    if (!emailInput.trim() || !selectedHouse) {
      alert('Please enter an email and select a house.');
      return;
    }
    alert(`Add user ${emailInput} to house ${selectedHouse}`);
    setEmailInput('');
    setSelectedHouse(null);
  };

  const renderUser = ({ item }: { item: User }) => (
    <View style={styles.userCard}>
      <TouchableOpacity style={styles.editBtn}>
        <Ionicons name="create-outline" size={24} color={Colors.primary} />
      </TouchableOpacity>
      <Text style={styles.userName}>
        {item.first_name} {item.last_name}
      </Text>
      <Text style={styles.userEmail}>{item.email}</Text>
    </View>
  );

  const renderHouse = ({ item }: { item: House }) => {
    const expanded = expandedHouses.has(item.id);
    return (
      <View style={styles.houseSection}>
        <TouchableOpacity
          style={styles.houseHeader}
          onPress={() => toggleHouse(item.id)}
          activeOpacity={0.7}
        >
          <Text style={styles.houseTitle}>{item.name}</Text>
          <Ionicons
            name={expanded ? 'chevron-up-outline' : 'chevron-down-outline'}
            size={28}
            color={Colors.primary}
          />
        </TouchableOpacity>
        {expanded && (
          <FlatList
            data={item.users}
            keyExtractor={(user) => user.id}
            renderItem={renderUser}
            scrollEnabled={false}
            contentContainerStyle={{ paddingBottom: Spacing(3) }}
          />
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.wrapper, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.wrapper}>
      {/* Add User Form at the top */}
      <View style={styles.addUserCard}>
        <Text style={styles.addUserTitle}>Add User</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter user email..."
          value={emailInput}
          onChangeText={setEmailInput}
          placeholderTextColor="#aaa"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <View style={styles.houseSelector}>
          {houses.map((house) => (
            <TouchableOpacity
              key={house.id}
              style={[
                styles.houseOption,
                selectedHouse === house.id && styles.houseOptionSelected,
              ]}
              onPress={() => setSelectedHouse(house.id)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.houseOptionText,
                  selectedHouse === house.id && styles.houseOptionTextSelected,
                ]}
              >
                {house.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.addUserBtn} onPress={handleAddUser}>
          <Text style={styles.addUserBtnText}>Add User</Text>
        </TouchableOpacity>
      </View>

      {/* Expandable Houses with Users */}
      <FlatList
        data={houses}
        keyExtractor={(item) => item.id}
        renderItem={renderHouse}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        style={{ paddingBottom: Spacing(8) }}
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
    marginBottom: Spacing(6),
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
