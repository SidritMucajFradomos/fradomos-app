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
  Pressable,
  DeviceEventEmitter,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing } from '../constant/Colors';
import LoadingOverlay from '../components/LoadingOverlay';
import { API_URL } from '../constant/Api';
import { getCurrentWeather, WEATHER_DEFAULT_CITY } from '../src/services/weather';
import axios from 'axios'; // added
// Add: focus hook
import { useFocusEffect } from '@react-navigation/native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const HERO_HEIGHT = Math.max(220, SCREEN_HEIGHT * 0.3);

// New: keep snap value in a const to reuse for index calculation
const SNAP = 280;

// New: energy cost assumption
const COST_PER_KWH = 0.32;

// New: types and fake-data utils
type TimeRange = 'day' | 'week' | 'month';

const seededRand = (seed: number) => {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
};
const hashStr = (str: string) => str.split('').reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) | 0, 7);

function buildFakeEnergySeries(homeId: string, range: TimeRange) {
  // Different per homeId and range, but stable
  const baseSeed = Math.abs(hashStr(homeId + '|' + range));
  const rnd = seededRand(baseSeed || 1);
  const seriesLen = range === 'day' ? 12 : range === 'week' ? 7 : 30; // 2h slots, weekdays, days
  const baseLoad = 0.8 + (hashStr(homeId) % 5) * 0.15; // different baseline per home
  const series: number[] = [];
  for (let i = 0; i < seriesLen; i++) {
    const peakFactor =
      range === 'day'
        ? (i >= 3 && i <= 7 ? 1.6 : 1) // day: peak around midday/evening
        : range === 'week'
        ? (i >= 4 ? 1.2 : 1) // week: weekend slightly higher
        : i % 7 === 0
        ? 1.25
        : 1; // month: weekly bumps
    const val = Math.max(0.3, baseLoad * (0.8 + rnd() * 0.8) * peakFactor);
    series.push(Number(val.toFixed(2)));
  }
  // Labels
  let labels: string[] = [];
  if (range === 'day') labels = Array.from({ length: seriesLen }, (_, i) => `${i * 2}h`);
  if (range === 'week') labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  if (range === 'month') labels = Array.from({ length: seriesLen }, (_, i) => `${i + 1}`);
  // Aggregate approximations
  const hourlyKwhAvg = 0.9; // rough conversion for demo
  const dailyKwh = range === 'day' ? series.reduce((a, b) => a + b, 0) * (24 / seriesLen) * 0.35 : series.slice(-7).reduce((a, b) => a + b, 0) * 3.5;
  const monthlyKwh = dailyKwh * 28 + (hashStr(homeId) % 20); // vary a bit per home
  const nowKw = Math.max(0.3, series[Math.max(0, series.length - 1)] + (rnd() - 0.5) * 0.4);
  return {
    series,
    labels,
    dailyKwh: Number(dailyKwh.toFixed(1)),
    monthlyKwh: Math.round(monthlyKwh),
    nowKw: Number(nowKw.toFixed(1)),
  };
}

interface Home {
  id: string | number;
  name: string;
  admin_id?: number | string;
  shared?: boolean;
  role?: string; // legacy compatibility
}

// New: quick fake homes to preview UI
const makeFakeHomes = (): Home[] => [
  { id: 'fake-1', name: 'City House', admin_id: '1', shared: false, role: 'owner' },
  { id: 'fake-2', name: 'Country Retreat', admin_id: '2', shared: true, role: 'member' },
];

// New: simple demo series so the chart always has bars
function buildDemoSeries(range: TimeRange, homeId: string) {
  const variant = homeId.includes('fake-2') || homeId.endsWith('2') ? 2 : 1;
  if (range === 'day') {
    const series =
      variant === 1
        ? [15, 18, 20, 24, 32, 45, 48, 38, 28, 22, 18, 16]
        : [12, 14, 16, 20, 26, 34, 36, 30, 24, 18, 15, 13];
    const labels = Array.from({ length: 12 }, (_, i) => `${i * 2}h`);
    return { series, labels };
  }
  if (range === 'week') {
    const series = variant === 1 ? [18, 20, 22, 24, 26, 30, 28] : [14, 16, 18, 19, 21, 25, 23];
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return { series, labels };
  }
  // month (30 days)
  const base = variant === 1 ? 20 : 16;
  const series = Array.from({ length: 30 }, (_, i) => {
    const wave = Math.sin((i / 30) * Math.PI * 2) * (variant === 1 ? 8 : 6);
    const trend = i > 20 ? 3 : 0;
    return Math.max(8, Math.round(base + wave + trend + (i % 5)));
  });
  const labels = Array.from({ length: 30 }, (_, i) => `${i + 1}`);
  return { series, labels };
}

// Reorder helper to put default first
const reorderByDefault = (list: Home[], defaultId?: string) => {
  if (!defaultId) return list;
  const idx = list.findIndex(h => String(h.id) === String(defaultId));
  if (idx <= 0) return list;
  const copy = list.slice();
  const [def] = copy.splice(idx, 1);
  return [def, ...copy];
};

export default function HomesScreen({ navigation }: any) {
  const [homes, setHomes] = useState<Home[]>([]);
  const [loading, setLoading] = useState(false);

  // homes where the current user is a member (accepted invites)
  const [memberHomes, setMemberHomes] = useState<Home[]>([]);

  const [weatherTemp, setWeatherTemp] = useState<number | null>(null);
  const [weatherIcon, setWeatherIcon] = useState<string | null>(null);
  const [weatherCondition, setWeatherCondition] = useState<string>('');
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState(false);

  const [timeNow, setTimeNow] = useState<string>('');

  // New: selected home and energy usage state
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [energyLoading, setEnergyLoading] = useState(false);
  const [energy, setEnergy] = useState<{ powerKw: number; dailyKwh: number; monthlyKwh: number } | null>(null);

  // New: range + chart data
  const [range, setRange] = useState<TimeRange>('day');
  const [chart, setChart] = useState<number[]>([]);
  const [chartLabels, setChartLabels] = useState<string[]>([]);

  const getToken = async () => await AsyncStorage.getItem('token');

  // Replace: ensure fake homes fallback if API fails or returns empty
  const fetchHomes = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('You must be logged in');

      const baseUrl = API_URL.replace(/\/$/, '');
      const headers = { Authorization: `Bearer ${token}` };

      // Primary homes returned by /homes
      const res = await axios.get(`${baseUrl}/homes`, { headers }).catch(() => ({ data: [] }));
      const raw = res.data;

      const primary: Home[] = Array.isArray(raw)
        ? raw.map((h: any) => ({
            id: h.id != null ? String(h.id) : String(Math.random()),
            name: h.name ?? h.title ?? `Home ${h.id ?? ''}`,
            admin_id: h.admin_id ?? null,
            shared: !!h.shared,
            role: h.role ?? (h.shared ? 'member' : 'owner'),
          }))
        : [];

      // Resolve current userId from token (fallback to /users/me)
      let userId: string | number | undefined;
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        userId = payload.userId || payload.id || payload.sub;
      } catch {
        userId = undefined;
      }
      if (!userId) {
        try {
          const me = await axios.get(`${baseUrl}/users/me`, { headers });
          userId = me.data?.id;
        } catch {
          userId = undefined;
        }
      }

      // Fetch accepted homes for this user (if available)
      let accepted: Home[] = [];
      if (userId) {
        try {
          const accRes = await axios.get(
            `${baseUrl}/home-invites/user/${encodeURIComponent(String(userId))}/accepted-homes`,
            { headers }
          );
          if (Array.isArray(accRes.data) && accRes.data.length) {
            accepted = accRes.data.map((h: any) => ({
              id: h.id != null ? String(h.id) : String(Math.random()),
              name: h.name ?? h.title ?? `Home ${h.id ?? ''}`,
              admin_id: h.admin_id ?? null,
              shared: !!h.shared,
              role: h.role ?? (h.shared ? 'member' : 'owner'),
            }));
          }
        } catch (e: any) {
          // Non-fatal: log and continue with primary homes
          console.warn('accepted-homes fetch failed:', e?.message ?? e);
        }
      }

      // store member homes separately for the "Member Homes" list
      setMemberHomes(accepted);

      // Remove member homes from primary list so My Homes contains only primary-only homes
      const acceptedIds = new Set(accepted.map(a => String(a.id)));
      const primaryOnly = primary.filter(p => !acceptedIds.has(String(p.id)));

      // set homes to primaryOnly (may be empty)
      const defaultId = await AsyncStorage.getItem('defaultHomeId');
      setHomes(reorderByDefault(primaryOnly, defaultId || undefined));
      setSelectedIndex(0);
    } catch (err: any) {
      console.error('fetchHomes error:', err?.message ?? err, err);
      // On error, clear lists so UI shows "no homes yet"
      setHomes([]);
      setMemberHomes([]);
      setSelectedIndex(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeather = async () => {
    setWeatherLoading(true);
    setWeatherError(false);
    try {
      const w = await getCurrentWeather(WEATHER_DEFAULT_CITY);
      setWeatherTemp(w.tempC);
      setWeatherCondition(w.conditionText);
      setWeatherIcon(w.iconName);
    } catch (error: any) {
      // Optional: remove alert to keep UI clean
      // Alert.alert('Error', error.message);
      setWeatherError(true);
      setWeatherTemp(null);
      setWeatherIcon(null);
    } finally {
      setWeatherLoading(false);
    }
  };

  // New: force simple fake energy values and chart
  const fetchEnergyUsage = async (homeId: string) => {
    setEnergyLoading(true);
    try {
      const base =
        homeId.includes('fake-1') || homeId.endsWith('1')
          ? { now: 50, daily: 125, monthly: 3200 } // City House
          : homeId.includes('fake-2') || homeId.endsWith('2')
          ? { now: 35, daily: 85, monthly: 2400 } // Country Retreat
          : { now: 42, daily: 100, monthly: 2800 }; // default

      setEnergy({
        powerKw: base.now,
        dailyKwh: base.daily,
        monthlyKwh: base.monthly,
      });

      // Use demo series so the chart is always populated
      const demo = buildDemoSeries(range, homeId);
      setChart(demo.series);
      setChartLabels(demo.labels);
    } finally {
      setEnergyLoading(false);
    }
  };

  useEffect(() => {
    fetchHomes();
    fetchWeather();
  }, []);

  // New: load energy for the initially selected home and whenever selection changes
  useEffect(() => {
    if (homes.length > 0) {
      const sel = homes[Math.min(selectedIndex, homes.length - 1)];
      if (sel?.id) fetchEnergyUsage(String(sel.id));
    } else {
      setEnergy(null);
      setChart([]);
      setChartLabels([]);
    }
  }, [homes, selectedIndex, range]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeNow(
        now.toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    };
    updateTime();
    const id = setInterval(updateTime, 30000);
    return () => clearInterval(id);
  }, []);

  const formatDateTime = () => {
    const now = new Date();
    return now.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = () => {
    const now = new Date();
    return now.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Detect OS theme
  const scheme = useColorScheme();
  // New: allow app-level override via event
  const [themeOverride, setThemeOverride] = useState<'light' | 'dark' | null>(null);
  const effectiveScheme = themeOverride ?? scheme;

  // Build palette from effective scheme
  const C = React.useMemo(() => {
    if (effectiveScheme === 'dark') {
      return {
        ...Colors,
        background: (Colors as any).backgroundDark ?? '#121212',
        surface: (Colors as any).surfaceDark ?? '#1E1E1E',
        border: (Colors as any).borderDark ?? '#2A2A2A',
        primary: (Colors as any).primaryDark ?? Colors.primary,
        onPrimary: (Colors as any).onPrimaryDark ?? Colors.onPrimary,
        error: (Colors as any).errorDark ?? Colors.error,
        // Weather hero background
        heroBg: (Colors as any).heroBgDark ?? '#0F172A',
      };
    }
    return {
      ...Colors,
      heroBg: (Colors as any).heroBgLight ?? '#D0E4FF',
    };
  }, [effectiveScheme]);

  // Rebuild on theme change and default-home change
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      'appThemeChanged',
      (mode?: 'light' | 'dark' | 'system' | null) => {
        setThemeOverride(mode === 'dark' ? 'dark' : mode === 'light' ? 'light' : null);
      }
    );
    const subDef = DeviceEventEmitter.addListener('defaultHomeChanged', (defaultId: string | number) => {
      const idStr = String(defaultId);
      setHomes(prev => reorderByDefault(prev, idStr));
      setSelectedIndex(0);
    });
    return () => {
      sub.remove();
      subDef.remove();
    };
  }, []);

  // Styles depend only on current palette
  const styles = React.useMemo(() => createStyles(C), [C]);

  // Add: also reorder when screen gains focus (covers cases where event was missed)
  useFocusEffect(
    React.useCallback(() => {
      let cancelled = false;
      (async () => {
        const defaultId = await AsyncStorage.getItem('defaultHomeId');
        if (!cancelled) {
          setHomes(prev => reorderByDefault(prev, defaultId || undefined));
          setSelectedIndex(0);
        }
      })();
      return () => { cancelled = true; };
    }, [])
  );

  // Open a home
  const openHome = (home: Home) => {
    navigation.navigate('Home', { homeId: home.id, homeName: home.name });
  };

  // Keep rendering logic inside the component
  if (loading) {
    return (
      <SafeAreaView style={[styles.screenWrapper, { justifyContent: 'center' }]}>
        <LoadingOverlay visible={true} text="Loading homes..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screenWrapper}>
      <View style={styles.container}>
        {/* Hero Header */}
        <View style={styles.headerHero}>
          <View style={styles.heroTopRow}>
            <Text style={styles.heroCity}>{WEATHER_DEFAULT_CITY}</Text>
            <View style={styles.heroDot} />
            <Text style={styles.heroCondition}>{weatherCondition}</Text>
          </View>
          <Text style={styles.heroTime}>{formatTime()}</Text>
          <Text style={styles.heroDate}>{formatDateTime()}</Text>
          <View style={styles.heroTempRow}>
            {weatherLoading ? (
              <ActivityIndicator size="small" color={C.textSecondary} />
            ) : weatherError ? (
              <Text style={styles.weatherErrorText}>weather not possible now</Text>
            ) : weatherTemp !== null ? (
              <>
                <Ionicons name={weatherIcon as any} size={28} color={C.textSecondary} />
                <Text style={styles.heroTemp}>{weatherTemp}°C</Text>
              </>
            ) : (
              <Text style={styles.weatherErrorText}>weather not possible now</Text>
            )}
          </View>
        </View>

        {/* Homes Section */}
        <View style={styles.homesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.title}>My Homes</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{homes.length}</Text>
            </View>
          </View>

          {homes.length > 0 ? (
            <FlatList
              data={homes}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalListContainer}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item, index }) => (
                <Pressable
                  onPress={() => openHome(item)}
                  onLongPress={() => setSelectedIndex(index)}
                  delayLongPress={150}
                  style={({ pressed }) => [
                    styles.card,
                    pressed && styles.cardPressed,
                    Platform.OS === 'web' && styles.cardWeb,
                  ]}
                >
                  <View style={styles.homeIconCircle}>
                    <Ionicons name="home-outline" size={28} color={C.textPrimary} />
                  </View>
                  <Text style={styles.homeName}>{item.name}</Text>
                  <View style={styles.homeFooterRow}>
                    {(item.shared || item.role === 'member') && (
                      <View style={styles.roleChip}>
                        <Text style={styles.roleChipText}>member</Text>
                      </View>
                    )}
                    <Pressable style={styles.arrowBtn} onPress={() => openHome(item)}>
                      <Ionicons name="chevron-forward" size={22} color={C.textSecondary} />
                    </Pressable>
                  </View>
                </Pressable>
              )}
              snapToInterval={SNAP}
              decelerationRate="fast"
              pagingEnabled={false}
              getItemLayout={(_, i) => ({
                length: 260 + Spacing(4),
                offset: (260 + Spacing(4)) * i,
                index: i,
              })}
              extraData={selectedIndex}
            />
          ) : (
            <Text style={styles.noHomesText}>no homes yet</Text>
          )}

          {/* Member Homes section rendered with the same horizontal card design */}
          {memberHomes.length > 0 ? (
            <>
              {/* clearer separation from My Homes */}
              <View style={{ height: Spacing(4) }} />
              <View style={styles.sectionHeader}>
                <Text style={styles.title}>Member Homes</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{memberHomes.length}</Text>
                </View>
              </View>

              <FlatList
                data={memberHomes}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalListContainer}
                keyExtractor={(item) => `member-${String(item.id)}`}
                renderItem={({ item, index }) => (
                  <Pressable
                    onPress={() => openHome(item)}
                    onLongPress={() => setSelectedIndex(index)}
                    delayLongPress={150}
                    style={({ pressed }) => [
                      styles.card,
                      styles.memberCard,
                      pressed && styles.cardPressed,
                      Platform.OS === 'web' && styles.cardWeb,
                    ]}
                  >
                    <View style={styles.homeIconCircle}>
                      <Ionicons name="people-outline" size={28} color={C.textPrimary} />
                    </View>
                    <Text style={styles.homeName}>{item.name}</Text>
                    <View style={styles.homeFooterRow}>
                      <View style={styles.roleChip}>
                        <Text style={styles.roleChipText}>member</Text>
                      </View>
                      <Pressable style={styles.arrowBtn} onPress={() => openHome(item)}>
                        <Ionicons name="chevron-forward" size={22} color={C.textSecondary} />
                      </Pressable>
                    </View>
                  </Pressable>
                )}
                snapToInterval={SNAP}
                decelerationRate="fast"
                pagingEnabled={false}
                getItemLayout={(_, i) => ({
                  length: 260 + Spacing(4),
                  offset: (260 + Spacing(4)) * i,
                  index: i,
                })}
                extraData={selectedIndex}
              />
            </>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

// Build styles from dynamic colors
const createStyles = (C: any) =>
  StyleSheet.create({
    screenWrapper: {
      flex: 1,
      alignItems: 'center',
      backgroundColor: C.background,
    },
    container: {
      flex: 1,
      width: '100%',
      maxWidth: 640,
      alignSelf: 'center',
      padding: Spacing(0),
    },
    homesSection: {
      width: '100%',
      marginTop: Spacing(3),
      paddingHorizontal: Spacing(3),
    },
    // Hero header styles
    headerHero: {
      backgroundColor: C.heroBg,
      paddingHorizontal: Spacing(5),
      paddingTop: Spacing(6),
      paddingBottom: Spacing(5),
      alignItems: 'center',
      justifyContent: 'center',
      borderBottomLeftRadius: 70,
      borderBottomRightRadius: 70,
      borderBottomWidth: 0,
      borderColor: C.border,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
    },
    heroTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing(1),
    },
    heroCity: {
      fontFamily: 'Dongle-Bold',
      fontSize: 28,
      color: C.textPrimary,
    },
    heroDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: C.border,
      marginHorizontal: Spacing(1),
    },
    heroCondition: {
      fontFamily: 'Dongle-Regular',
      fontSize: 22,
      color: C.textSecondary,
    },
    heroTime: {
      fontFamily: 'Dongle-Bold',
      fontSize: 64,
      color: C.textPrimary,
      lineHeight: 66,
    },
    heroDate: {
      fontFamily: 'Dongle-Regular',
      fontSize: 22,
      color: C.textSecondary,
      marginBottom: Spacing(1),
    },
    heroTempRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing(1),
    },
    heroTemp: {
      fontFamily: 'Dongle-Bold',
      fontSize: 26,
      color: C.textPrimary,
    },
    weatherErrorText: {
      // small red label for API failure
      fontFamily: 'Dongle-Regular',
      fontSize: 16,
      color: C.error,
    },
    // Section header
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 0,
      marginTop: 0,
      marginBottom: 0,
    },
    title: {
      fontFamily: 'Dongle-Bold',
      fontSize: 36,
      color: C.textPrimary,
      textAlign: 'left',
    },
    countBadge: {
      marginLeft: Spacing(2),
      paddingHorizontal: Spacing(2),
      paddingVertical: 2,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: 'transparent',
    },
    countBadgeText: {
      fontFamily: 'Dongle-Bold',
      fontSize: 20,
      color: C.textSecondary,
      lineHeight: 22,
    },
    // Card styles
    horizontalListContainer: {
      paddingHorizontal: 0,
      paddingBottom: Spacing(1),
    },
    card: {
      backgroundColor: C.surface,
      borderRadius: 16,
      width: 260,
      height: 150,
      marginHorizontal: Spacing(2),
      padding: Spacing(4),
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      elevation: 2,
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      borderWidth: 0,
    },
    cardPressed: {
      transform: [{ scale: 0.98 }],
    },
    cardWeb: {
      cursor: 'pointer',
    } as any,
    memberCard: {
      marginHorizontal: Spacing(4),
    },
    homeIconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: C.border,
    },
    homeFooterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'stretch',
      marginTop: Spacing(1),
    },
    roleChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing(2),
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: C.border,
    },
    roleChipText: {
      fontFamily: 'Dongle-Regular',
      fontSize: 18,
      color: C.textSecondary,
    },
    homeName: {
      fontFamily: 'Dongle-Bold',
      fontSize: 28,
      color: C.textPrimary,
    },
    arrowBtn: {
      marginLeft: 'auto',
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: C.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    noHomesText: {
      marginTop: Spacing(10),
      fontFamily: 'Dongle-Regular',
      fontSize: 28,
      color: C.textSecondary,
      textAlign: 'center',
    },
    // New: Future placeholder styles
    futureSection: {
      paddingHorizontal: 0,
      marginTop: Spacing(2),
      marginBottom: Spacing(3),
    },
    futureCard: {
      backgroundColor: C.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.border,
      paddingVertical: Spacing(4),
      paddingHorizontal: Spacing(3),
      alignItems: 'center',
      justifyContent: 'center',
    },
    futureTitle: {
      fontFamily: 'Dongle-Bold',
      fontSize: 32,
      color: C.textPrimary,
      marginTop: Spacing(1),
    },
    futureSubtitle: {
      fontFamily: 'Dongle-Regular',
      fontSize: 22,
      color: C.textSecondary,
      marginTop: Spacing(1),
    },
    futureCircle: {
      marginTop: Spacing(1),
      width: 72,
      height: 72,
      borderRadius: 36,
      borderWidth: 1,
      borderColor: C.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    futureBig: {
      fontFamily: 'Dongle-Bold',
      fontSize: 44,
      color: C.textPrimary,
      lineHeight: 46,
    },
  });
