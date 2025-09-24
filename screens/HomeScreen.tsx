import React, { useState, useEffect, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform,
  Dimensions,
  ScrollView,
  RefreshControl,
  DeviceEventEmitter, // added
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing } from '../constant/Colors';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import ErrorBanner from '../components/ErrorBanner';
import LoadingOverlay from '../components/LoadingOverlay';
import { API_URL } from '../constant/Api';

type HomeScreenRouteProp = RouteProp<RootStackParamList, 'Home'>;

type Props = {
  route: HomeScreenRouteProp;
  navigation: any;
};

type Room = {
  id: string | number;
  name: string;
  circuit_id?: string;
  home_id?: string | number;
};

// NEW: access-permissions payload may contain room_id
type AccessPerm = {
  room_name?: string;
  room_id?: string | number;
};

// Fetch with timeout helper
const fetchWithTimeout = (url: string, options: any = {}, timeout = 7000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(id));
};

export default function HomeScreen({ route, navigation }: Props) {
  const { homeId, homeName } = route.params;
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Listen to theme updates (styles are created inside component already)
  const [themeTick, setThemeTick] = useState(0);
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('appThemeChanged', () =>
      setThemeTick((t) => t + 1)
    );
    return () => sub.remove();
  }, []);

  const insets = useSafeAreaInsets();
  const bottomPad = insets.bottom + Spacing(16);

  // Store accessible room names based on current permissions
  const [accessibleRooms, setAccessibleRooms] = useState<Set<string>>(new Set());

  // Helper to decode JWT token and get userId
  const getUserIdFromToken = (token: string): string | null => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const payload = JSON.parse(jsonPayload);
      return payload.userId || null;
    } catch {
      return null;
    }
  };

  // Load cached rooms and access immediately for faster first paint
  useEffect(() => {
    (async () => {
      try {
        const cachedRooms = await AsyncStorage.getItem(`cache:rooms:${homeId}`);
        if (cachedRooms) {
          setRooms(JSON.parse(cachedRooms));
          setLoading(false);
        }
        const cachedAccess = await AsyncStorage.getItem(`cache:access:${homeId}`);
        if (cachedAccess) {
          const arr = JSON.parse(cachedAccess) as string[];
          setAccessibleRooms(new Set(arr));
        }
      } catch {}
    })();
  }, [homeId]);

  const loadData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setErrorMsg('User not logged in');
        return;
      }
      const userId = getUserIdFromToken(token);
      if (!userId) {
        setErrorMsg('Invalid token');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` } as any;
      const roomsUrl = `${API_URL}/rooms/homes/${homeId}/rooms`;
      const accessUrl = `${API_URL}/access-permissions/filter?home_id=${homeId}&user_id=${userId}`;

      const roomsPromise = fetchWithTimeout(roomsUrl, { headers }).then(async (res) => {
        if (!res.ok) throw new Error(`Failed to fetch rooms: ${res.status}`);
        return res.json();
      });
      const accessPromise = fetchWithTimeout(accessUrl, { headers }).then(async (res) => {
        if (!res.ok) throw new Error('Failed to fetch access permissions');
        return res.json();
      });

      // Show rooms as soon as they arrive
      const roomsData: Room[] = await roomsPromise;
      setRooms(roomsData);
      AsyncStorage.setItem(`cache:rooms:${homeId}`, JSON.stringify(roomsData)).catch(() => {});
      // NEW: mark all fetched rooms as accessible (members should not see "No access")
      const initialAccessible = new Set(roomsData.map((r) => r.name));
      setAccessibleRooms(initialAccessible);
      AsyncStorage.setItem(`cache:access:${homeId}`, JSON.stringify(Array.from(initialAccessible))).catch(() => {});
      setLoading(false);

      // Fetch access data only to discover extra room_ids that may not be in the list yet
      const accessData: AccessPerm[] = await accessPromise;

      // Discover missing rooms by room_id and fetch them
      const accessRoomIds = accessData
        .map((p) => (p.room_id != null ? String(p.room_id) : null))
        .filter((v): v is string => !!v);

      const currentIds = new Set(roomsData.map((r) => String(r.id)));
      const missingRoomIds = accessRoomIds.filter((id) => !currentIds.has(id));

      let latestRooms = roomsData;

      if (missingRoomIds.length) {
        const extraResults = await Promise.allSettled(
          missingRoomIds.map((id) =>
            fetchWithTimeout(`${API_URL}/rooms/${id}`, { headers }).then(async (res) => {
              if (!res.ok) throw new Error(`Failed to fetch room ${id}`);
              return (await res.json()) as Room;
            })
          )
        );

        const extraRooms: Room[] = extraResults
          .filter((r): r is PromiseFulfilledResult<Room> => r.status === 'fulfilled')
          .map((r) => r.value);

        if (extraRooms.length) {
          const mergedMap = new Map<string, Room>();
          [...roomsData, ...extraRooms].forEach((r) => mergedMap.set(String(r.id), r));
          const mergedRooms = Array.from(mergedMap.values());
          latestRooms = mergedRooms;
          setRooms(mergedRooms);
          AsyncStorage.setItem(`cache:rooms:${homeId}`, JSON.stringify(mergedRooms)).catch(() => {});
        }
      }

      // NEW: ensure all rooms for this home are marked accessible
      const finalAccessible = new Set(latestRooms.map((r) => r.name));
      setAccessibleRooms(finalAccessible);
      AsyncStorage.setItem(`cache:access:${homeId}`, JSON.stringify(Array.from(finalAccessible))).catch(() => {});
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setErrorMsg('Request timed out. Pull to refresh.');
      } else {
        setErrorMsg(err?.message || 'Failed to load data');
      }
    } finally {
      // ensure loading flag cleared on all code paths
      setLoading(false);
      setRefreshing(false);
    }
  }, [homeId]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Routines (quick actions)
  const routines = [
    { id: 'r1', icon: 'sunny-outline' as const, name: 'Good Morning', desc: 'Open blinds, lights 30%', scheduledTime: '07:00' },
    { id: 'r2', icon: 'moon-outline' as const, name: 'Good Night', desc: 'Off lights, arm security', scheduledTime: '23:00' },
    { id: 'r3', icon: 'walk-outline' as const, name: 'Away', desc: 'Eco mode, turn off devices' },
    { id: 'r4', icon: 'home-outline' as const, name: "I'm Home", desc: 'Welcome lights, comfy temp' },
    { id: 'r5', icon: 'flame-outline' as const, name: 'Warm Up', desc: 'Heat to 22°C', scheduledTime: '06:30' },
    { id: 'r6', icon: 'snow-outline' as const, name: 'Cool Down', desc: 'AC to 20°C' },
    { id: 'r7', icon: 'bulb-outline' as const, name: 'Evening Lights', desc: 'Dim 40%', scheduledTime: '18:30' },
    { id: 'r8', icon: 'videocam-outline' as const, name: 'Security', desc: 'Arm cameras' },
  ];

  const runRoutine = (routineId: string) => {
    Alert.alert('Routine', 'Routine started: ' + routineId);
  };

  const screenWidth = Dimensions.get('window').width;
  const cardSpacing = Spacing(2);
  const fullCardWidth = (screenWidth - Spacing(8)) / 2;

  // Pick a better icon based on room name
  const getRoomIcon = (name: string): any => {
    const s = name.toLowerCase();
    if (s.includes('kitchen')) return 'restaurant-outline';
    if (s.includes('bed') || s.includes('sleep')) return 'moon-outline';
    if (s.includes('living') || s.includes('lounge')) return 'tv-outline';
    if (s.includes('bath') || s.includes('toilet') || s.includes('wash')) return 'water-outline';
    if (s.includes('garage')) return 'car-outline';
    if (s.includes('office') || s.includes('study')) return 'briefcase-outline';
    if (s.includes('guest')) return 'person-outline';
    if (s.includes('kid') || s.includes('child')) return 'happy-outline';
    return 'cube-outline';
  };

  const styles = StyleSheet.create({
    screenWrapper: { flex: 1, alignItems: 'center', backgroundColor: Colors.background },
    container: {
      flex: 1,
      width: '100%',
      maxWidth: 640,
      alignSelf: 'center',
      backgroundColor: Colors.background,
      paddingHorizontal: Spacing(4),
      paddingTop: Spacing(6),
    },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing(2) },
    titleWrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing(2) },
    // Added missing header styles
    titleScroll: { maxWidth: 200, marginRight: Spacing(2) },
    title: { fontFamily: 'Dongle-Bold', fontSize: 48, color: Colors.textPrimary },
    addBtn: { padding: Spacing(2) },

    countPill: { paddingHorizontal: Spacing(2), paddingVertical: 2, borderRadius: 999, borderWidth: 1, borderColor: Colors.border },
    countPillText: { fontFamily: 'Dongle-Bold', fontSize: 20, color: Colors.textSecondary },

    // Room cards redesign
    gridRow: { justifyContent: 'space-between', marginBottom: 0 },
    card: {
      backgroundColor: Colors.surface,
      width: fullCardWidth - cardSpacing,
      height: 156,
      borderRadius: 16,
      padding: Spacing(3),
      justifyContent: 'space-between',
      elevation: 3,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      marginBottom: Spacing(3),
      borderWidth: 1,
      borderColor: Colors.border,
    },
    // Added missing web cursor style
    cardWeb: { cursor: 'pointer' } as any,
    cardDisabled: { backgroundColor: '#f2f2f2', borderColor: Colors.border },
    cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    roomLeftCol: { alignItems: 'center', justifyContent: 'center', width: 56 },
    iconWrap: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eef3ff', borderWidth: 1, borderColor: Colors.border },
    statusBelow: { marginTop: 4 },
    statusChip: { paddingHorizontal: Spacing(2), paddingVertical: 2, borderRadius: 999, borderWidth: 1, borderColor: Colors.border, backgroundColor: 'transparent' },
    statusChipDanger: { borderColor: '#ffb3b3', backgroundColor: '#fff0f0' },
    statusText: { fontFamily: 'Dongle-Regular', fontSize: 18, color: Colors.textSecondary },
    statusTextSmall: { fontFamily: 'Dongle-Regular', fontSize: 16, color: Colors.textSecondary },
    statusTextDanger: { color: '#b00020' },
    roomRightCol: { flex: 1, paddingLeft: Spacing(2), justifyContent: 'space-between' },
    roomNameLarge: { fontFamily: 'Dongle-Bold', fontSize: 26, color: Colors.textPrimary, flexShrink: 1 },
    arrowRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },

    // Routines compact chips
    routinesHeader: { marginTop: Spacing(2), marginBottom: Spacing(1) },
    routinesTitle: { fontFamily: 'Dongle-Bold', fontSize: 32, color: Colors.textPrimary },
    // Add the missing routines grid wrap style
    routineGridWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    routineCardGrid: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: Spacing(3), width: (Dimensions.get('window').width - Spacing(8)) / 2 - Spacing(2), marginBottom: Spacing(3), elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
    routineTitle: { fontFamily: 'Dongle-Bold', fontSize: 22, color: Colors.textPrimary, marginTop: Spacing(1) },
    routineDesc: { fontFamily: 'Dongle-Regular', fontSize: 18, color: Colors.textSecondary },
    timeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing(1), marginTop: Spacing(1) },
    metaText: { fontFamily: 'Dongle-Regular', fontSize: 18, color: Colors.textSecondary },

    // Empty state CTA
    emptyWrap: { alignItems: 'center', paddingVertical: Spacing(8) },
    // Added missing empty text style used in ListEmptyComponent
    noRoomsText: { fontFamily: 'Dongle-Regular', fontSize: 28, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing(2) },
    emptyButton: { marginTop: Spacing(2), paddingHorizontal: Spacing(4), paddingVertical: Spacing(2), borderRadius: 10, backgroundColor: Colors.primary },
    emptyButtonText: { color: '#fff', fontFamily: 'Dongle-Bold', fontSize: 24 },

    bottomSpacer: { height: Spacing(12) },

    // Added back modal styles referenced below
    modalBackdrop: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'center', alignItems: 'center' },
    modalContent: { backgroundColor: Colors.surface, borderRadius: 20, padding: Spacing(5), width: '90%', maxWidth: 400 },
    modalTitle: { fontFamily: 'Dongle-Bold', fontSize: 36, marginBottom: Spacing(3), color: Colors.textPrimary, textAlign: 'center' },
    input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingVertical: Spacing(3), paddingHorizontal: Spacing(4), fontSize: 26, backgroundColor: Colors.background, fontFamily: 'Dongle-Regular', color: Colors.textPrimary, marginBottom: Spacing(4) },
    modalBtns: { flexDirection: 'row', justifyContent: 'space-around' },
    modalBtn: { paddingVertical: Spacing(3), paddingHorizontal: Spacing(6), borderRadius: 10 },
    modalBtnText: { fontFamily: 'Dongle-Bold', fontSize: 28, color: Colors.surface },

    // Header menu styles
    menuBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)' },
    menuSheet: { position: 'absolute', top: Spacing(6), right: Spacing(2), backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, paddingVertical: Spacing(1), width: 200, elevation: 4, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
    menuItem: { paddingVertical: Spacing(2), paddingHorizontal: Spacing(3), flexDirection: 'row', alignItems: 'center', gap: Spacing(2) },
    menuItemText: { fontFamily: 'Dongle-Regular', fontSize: 22, color: Colors.textPrimary },
  });

  return (
    <SafeAreaView style={styles.screenWrapper}>
      <ErrorBanner message={errorMsg} onDismiss={() => setErrorMsg(null)} />
      <LoadingOverlay visible={loading} text="Loading home..." />
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View style={styles.titleWrap}>
            <ScrollView horizontal style={styles.titleScroll} showsHorizontalScrollIndicator={false}>
              <Text style={styles.title}>{homeName}</Text>
            </ScrollView>
            <View style={styles.countPill}><Text style={styles.countPillText}>{rooms.length}</Text></View>
          </View>
        </View>

        {/* Rooms grid with routines footer */}
        <FlatList
          data={rooms}
          keyExtractor={(room) => String(room.id)}
           refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
           renderItem={({ item }) => {
             const hasAccess = accessibleRooms.has(item.name);
             const CardComponent: any = hasAccess ? TouchableOpacity : View;
             const onPress = hasAccess ? () => navigation.navigate('Room', { roomId: item.id, roomName: item.name }) : undefined;
            return (
              <CardComponent style={[styles.card, Platform.OS === 'web' && styles.cardWeb, !hasAccess && styles.cardDisabled]} onPress={onPress}>
                <View style={{ flexDirection: 'row' }}>
                  <View style={styles.roomLeftCol}>
                    <View style={styles.iconWrap}>
                      <Ionicons name={getRoomIcon(item.name)} size={22} color={hasAccess ? Colors.primary : '#777'} />
                    </View>
                    <View style={styles.statusBelow}>
                      <Text style={[styles.statusTextSmall, !hasAccess && { color: '#b00020' }]}>{hasAccess ? 'Accessible' : 'No access'}</Text>
                    </View>
                  </View>
                  <View style={styles.roomRightCol}>
                    <Text style={styles.roomNameLarge} numberOfLines={2} ellipsizeMode="tail">{item.name}</Text>
                    <View style={styles.arrowRow}>
                      <Ionicons name="chevron-forward-outline" size={18} color={hasAccess ? Colors.textSecondary : '#aaa'} />
                    </View>
                  </View>
                </View>
              </CardComponent>
            );
          }}
          showsVerticalScrollIndicator={false}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={{ paddingBottom: bottomPad }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.noRoomsText}>No rooms found for this home.</Text>
              {/* Add-room action removed from this screen */}
            </View>
          }
          ListFooterComponent={() => (
            <View>
              <View style={styles.routinesHeader}>
                <Text style={styles.routinesTitle}>House routines</Text>
              </View>
              <View style={styles.routineGridWrap}>
                {routines.map((r) => (
                  <TouchableOpacity key={r.id} style={styles.routineCardGrid} onPress={() => runRoutine(r.id)}>
                    <Ionicons name={r.icon} size={20} color={Colors.textSecondary} />
                    <Text style={styles.routineTitle}>{r.name}</Text>
                    <Text style={styles.routineDesc}>{r.desc}</Text>
                    {r.scheduledTime ? (
                      <View style={styles.timeRow}>
                        <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
                        <Text style={styles.metaText}>{r.scheduledTime}</Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </View>
              <View style={{ height: bottomPad }} />
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}
               