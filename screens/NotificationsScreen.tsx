import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  DeviceEventEmitter, // added
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../constant/Colors';
import LoadingOverlay from '../components/LoadingOverlay';
import ErrorBanner from '../components/ErrorBanner';
import { API_URL } from '../constant/Api';


export default function NotificationsScreen() {
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fakeNotifications = [
    { id: 'n1', icon: 'walk-outline' as const, title: 'Motion detected', message: 'Backyard camera', time: '5m ago' },
    { id: 'n2', icon: 'lock-open-outline' as const, title: 'Door opened', message: 'Front door', time: '12m ago' },
    { id: 'n3', icon: 'thermometer-outline' as const, title: 'Thermostat changed', message: 'Living room set to 22°C', time: '1h ago' },
    { id: 'n4', icon: 'flash-outline' as const, title: 'Energy usage high', message: 'Kitchen circuit', time: 'Yesterday' },
    { id: 'n5', icon: 'wifi-outline' as const, title: 'Device reconnected', message: 'Garage hub online', time: '2 days ago' },
    // Added alerts
    { id: 'n6', icon: 'flame-outline' as const, title: 'High temperature', message: 'Boiler room 54°C', time: 'Just now', severity: 'critical' as const },
    { id: 'n7', icon: 'thermometer-outline' as const, title: 'High temperature', message: 'Attic 51°C', time: '7m ago', severity: 'critical' as const },
    { id: 'n8', icon: 'bulb-outline' as const, title: 'Light on too long', message: 'Hallway lamp on for 6h', time: '20m ago', severity: 'warning' as const },
    { id: 'n9', icon: 'bulb-outline' as const, title: 'Light on too long', message: 'Garden lights on for 8h', time: 'Today', severity: 'warning' as const },
  ];

  // Load pending invites for the currently logged-in user's email
  const loadInvites = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('User not authenticated');

      // parse JWT payload to obtain userId (same method as ProfileScreen)
      let userId: string | number | undefined;
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        userId = payload.userId || payload.id || payload.sub;
      } catch {
        userId = undefined;
      }

      const headers = { Authorization: `Bearer ${token}` };
      if (!userId) {
        // fallback: try /users/me to obtain id/email
        try {
          const me = await axios.get(`${API_URL}/users/me`, { headers });
          userId = me.data?.id;
          if (!userId) throw new Error('Could not determine user id');
        } catch (e) {
          throw new Error('Could not determine user id/email');
        }
      }

      // fetch full user record to get email (mirrors ProfileScreen approach)
      const userRes = await axios.get(`${API_URL}/users/${userId}`, { headers });
      const email = userRes.data?.email;
      if (!email) throw new Error('Could not determine user email');

      // call the email-based endpoint that returns only pending invites (status = 0)
      const res = await axios.get(`${API_URL}/home-invites/user/${encodeURIComponent(email)}`, { headers });

      // server already returns only pending invites, but filter defensively
      const pending = Array.isArray(res.data) ? res.data.filter((i: any) => Number(i.status) === 0) : [];
      setInvites(pending);
    } catch (error: any) {
      setErrorMsg(error?.message || 'Error fetching invites');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInvites();
  };

  const handleRespond = async (id: number, accept: boolean) => {
    try {
      setActingId(id);
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Not authenticated');
      const headers = { Authorization: `Bearer ${token}` };

      if (accept) {
        // Accept: use PUT to set status to 1
        const payload = { status: 1 };
        await axios.put(`${API_URL}/home-invites/${id}`, payload, { headers });

        // if accepted, also set current user's role to 'member'
        try {
          // try to read userId from token
          let userId: string | number | undefined;
          try {
            const tokenPayload = JSON.parse(atob(token.split('.')[1]));
            userId = tokenPayload.userId || tokenPayload.id || tokenPayload.sub;
          } catch {
            userId = undefined;
          }

          // fallback to /users/me if token doesn't contain id
          if (!userId) {
            const me = await axios.get(`${API_URL}/users/me`, { headers });
            userId = me.data?.id;
          }

          if (userId) {
            await axios.patch(`${API_URL}/users/${userId}/role`, { role: 'member' }, { headers });
          }
        } catch (roleErr: any) {
          console.warn('Failed to update user role to member:', roleErr?.message || roleErr);
          // show non-fatal error to user
          setErrorMsg('Invite accepted but failed to update your role.');
        }
      } else {
        // Decline: use DELETE /delete-own/:inviteId
        await axios.delete(`${API_URL}/home-invites/delete-own/${id}`, { headers });
      }

      // remove locally on success
      setInvites((prev) => prev.filter((invite) => invite.id !== id));
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'Failed to respond to the invite');
    } finally {
      setActingId(null);
    }
  };

  const handleClearAll = () => {
    if (!invites.length) return;
    Alert.alert('Clear all?', 'Remove all pending invitations from this list?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => setInvites([]) },
    ]);
  };

  // Listen to theme updates and rebuild styles
  const [themeTick, setThemeTick] = useState(0);
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('appThemeChanged', () =>
      setThemeTick((t) => t + 1)
    );
    return () => sub.remove();
  }, []);
  const styles = React.useMemo(() => createStyles(), [themeTick]);

  // Sort notifications from newest to oldest (by id order in this mock)
  const sortedNotifications = [...fakeNotifications];

  // If you want to sort by time, you could implement a custom sort function here.
  // For now, reverse the array to show the last item (newest) first:
  sortedNotifications.reverse();

  if (loading) {
    return (
      <SafeAreaView style={styles.wrapperCenter}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.wrapper}>
      <ErrorBanner message={errorMsg} onDismiss={() => setErrorMsg(null)} />
      <LoadingOverlay visible={!!actingId} text="Updating invite..." />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 180 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>Notifications</Text>
          {/* Removed headerActions (delete and refresh buttons) */}
        </View>

        {/* Invitations at the top */}
        <View style={styles.subHeaderRow}>
          <Text style={styles.subTitle}>Invitations</Text>
        </View>
        <View style={styles.countBadge}><Text style={styles.countBadgeText}>{invites.length}</Text></View>
        {!invites.length && (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={32} color={Colors.textSecondary} />
            <Text style={styles.emptyText}>No pending invitations.</Text>
          </View>
        )}
        {invites.map((item) => (
          <View key={item.id} style={styles.inviteCard}>
            <View style={styles.inviteHeader}>
              <View style={styles.avatar}>
                <Ionicons name="person-add-outline" size={18} color={Colors.textSecondary} />
              </View>
              <Text style={styles.inviteText}>
                <Text style={styles.boldText}>
                  {item.invited_by_first_name} {item.invited_by_last_name}
                </Text>
                <Text> invited you to </Text>
                <Text style={styles.boldText}>{item.house_name}</Text>
              </Text>
            </View>
            <View style={styles.buttonsRow}>
              <TouchableOpacity
                style={[styles.button, styles.acceptButton]}
                onPress={() => handleRespond(item.id, true)}
                disabled={actingId === item.id}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                <Text style={styles.buttonText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.declineButton]}
                onPress={() => handleRespond(item.id, false)}
                disabled={actingId === item.id}
              >
                <Ionicons name="close-circle-outline" size={18} color="#fff" />
                <Text style={styles.buttonText}>Decline</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Recent Notifications below */}
        <View style={styles.subHeaderRow}>
          <Text style={styles.subTitle}>Recent Notifications</Text>
        </View>
        {sortedNotifications.map((n) => (
          <View key={n.id} style={[styles.notifCard, n.severity === 'critical' && styles.notifCardCritical, n.severity === 'warning' && styles.notifCardWarning]}>
            <View style={styles.notifRow}>
              <View style={styles.avatar}>
                <Ionicons name={n.icon} size={18} color={n.severity === 'critical' ? '#f44336' : n.severity === 'warning' ? '#ff9800' : Colors.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.boldText}>{n.title}</Text>
                <Text style={styles.inviteText}>{n.message}</Text>
              </View>
              <View style={styles.notifRight}>
                {n.severity && (
                  <View style={[styles.badge, n.severity === 'critical' ? styles.badgeCritical : styles.badgeWarning]}>
                    <Text style={styles.badgeText}>{n.severity === 'critical' ? 'ALERT' : 'Warning'}</Text>
                  </View>
                )}
                <Text style={styles.metaText}>{n.time}</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = () =>
  StyleSheet.create({
    wrapper: { flex: 1, alignItems: 'center', backgroundColor: Colors.background },
    wrapperCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
    container: { flex: 1, width: '100%', maxWidth: 640, alignSelf: 'center', padding: Spacing(4) },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontFamily: 'Dongle-Bold', fontSize: 42, color: Colors.textPrimary },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing(1) },
    headerIconBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
    countBadge: { alignSelf: 'flex-start', marginTop: Spacing(1), paddingHorizontal: Spacing(2), paddingVertical: 2, borderRadius: 999, borderWidth: 1, borderColor: Colors.border, backgroundColor: 'transparent' },
    countBadgeText: { fontFamily: 'Dongle-Bold', fontSize: 20, color: Colors.textSecondary, lineHeight: 22 },
    listContent: { paddingVertical: Spacing(2), paddingBottom: Spacing(16) },
    inviteCard: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: Spacing(3), marginTop: Spacing(2), shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
    inviteHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing(2) },
    avatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', marginRight: Spacing(2) },
    inviteText: { flex: 1, fontFamily: 'Dongle-Regular', fontSize: 22, color: Colors.textPrimary },
    boldText: { fontFamily: 'Dongle-Bold', fontSize: 22, color: Colors.textPrimary },
    buttonsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing(2) },
    button: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing(2), borderRadius: 10, gap: Spacing(1) },
    acceptButton: { backgroundColor: '#4caf50' },
    declineButton: { backgroundColor: '#f44336' },
    buttonText: { color: '#fff', fontFamily: 'Dongle-Bold', fontSize: 22 },
    emptyState: { alignItems: 'center', paddingVertical: Spacing(10) },
    emptyText: { marginTop: Spacing(2), fontFamily: 'Dongle-Regular', fontSize: 22, color: Colors.textSecondary },
    bottomSpacer: { height: Spacing(12) },
    subHeaderRow: { marginTop: Spacing(3) },
    subTitle: { fontFamily: 'Dongle-Bold', fontSize: 32, color: Colors.textPrimary },
    notifCard: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: Spacing(3), marginTop: Spacing(1), shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
    notifCardCritical: { borderColor: '#f44336', backgroundColor: '#fdecea' },
    notifCardWarning: { borderColor: '#ff9800', backgroundColor: '#fff4e5' },
    notifRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing(2) },
    notifRight: { alignItems: 'flex-end' },
    metaText: { fontFamily: 'Dongle-Regular', fontSize: 18, color: Colors.textSecondary, marginLeft: Spacing(2) },
    badge: { paddingHorizontal: Spacing(1.5), paddingVertical: 2, borderRadius: 999, marginBottom: Spacing(1) },
    badgeCritical: { backgroundColor: '#f44336' },
    badgeWarning: { backgroundColor: '#ff9800' },
    badgeText: { color: '#fff', fontFamily: 'Dongle-Bold', fontSize: 18 },
  });
