import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing } from '../constant/Colors';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';

const API_URL = 'http://api.fradomos.al:3000';

type HomeScreenRouteProp = RouteProp<RootStackParamList, 'Home'>;

type Props = {
  route: HomeScreenRouteProp;
  navigation: any;
};

type Room = {
  id: string;
  name: string;
  circuit_id?: string;
  home_id?: string | number;
};

export default function HomeScreen({ route, navigation }: Props) {
  const { homeId, homeName } = route.params;
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          Alert.alert('Error', 'User not logged in');
          return;
        }

        const res = await fetch(`${API_URL}/rooms`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch rooms: ${res.status}`);
        }

        const data: Room[] = await res.json();
        const filtered = data.filter((room) => String(room.home_id) === String(homeId));
        setRooms(filtered);
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to fetch rooms');
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, [homeId]);

  const renderRoom = ({ item }: { item: Room }) => (
    <TouchableOpacity
      style={[styles.card, Platform.OS === 'web' && styles.cardWeb]}
      onPress={() => navigation.navigate('Room', { roomId: item.id, roomName: item.name })}
      activeOpacity={0.9}
    >
      <Ionicons name="cube-outline" size={44} color={Colors.primary} />
      <Text style={styles.roomName} numberOfLines={2}>{item.name}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.screenWrapper, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screenWrapper}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{homeName}</Text>
          <TouchableOpacity
            onPress={() => console.log('Edit or settings pressed')}
            style={styles.editBtn}
          >
            <Ionicons name="settings-outline" size={32} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {rooms.length === 0 ? (
          <Text style={styles.noRoomsText}>This home has no rooms yet.</Text>
        ) : (
          <FlatList
            data={rooms}
            keyExtractor={(room) => room.id}
            renderItem={renderRoom}
            showsVerticalScrollIndicator={false}
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={{ paddingBottom: Spacing(6) }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const screenWidth = Dimensions.get('window').width;
const cardSpacing = Spacing(2);
const fullCardWidth = (screenWidth - Spacing(8)) / 2;

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
    paddingHorizontal: Spacing(4),
    paddingTop: Spacing(6),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing(3),
  },
  title: {
    fontFamily: 'Dongle-Bold',
    fontSize: 48,
    color: Colors.textPrimary,
  },
  editBtn: {
    padding: Spacing(2),
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  card: {
    backgroundColor: Colors.surface,
    width: fullCardWidth - cardSpacing,
    height: fullCardWidth - cardSpacing,
    borderRadius: 20,
    padding: Spacing(4),
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    marginBottom: Spacing(4),
  },
  cardWeb: {
    cursor: 'pointer',
  } as any,
  roomName: {
    fontFamily: 'Dongle-Regular',
    fontSize: 30,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginTop: Spacing(6),
  },
  noRoomsText: {
    fontFamily: 'Dongle-Regular',
    fontSize: 28,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing(10),
  },
});
