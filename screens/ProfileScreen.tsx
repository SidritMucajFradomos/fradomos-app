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
  DeviceEventEmitter,
  Image, // added
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../constant/Colors';
import { useNavigation } from '@react-navigation/native';
import { API_URL } from '../constant/Api';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import LoadingOverlay from '../components/LoadingOverlay';

type RootStackParamList = {
  Login: undefined;
  Profile: undefined;
};

type ProfileScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Profile'
>;

export default function ProfileScreen() {
  const navigation = useNavigation<ProfileScreenNavigationProp>();

  const [form, setForm] = useState({
    name: '',
    lastname: '',
    username: '', // added
    email: '',
    phone_nr: '',
  });

  const [profileImageUri, setProfileImageUri] = useState<string | null>(null); // added

  // remove edit mode state & edit-related functions
  // const [editMode, setEditMode] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(false);

  // Derived UI-only values
  const fullName = [form.name, form.lastname].filter(Boolean).join(' ');
  const initials = (
    ((form.name?.[0] || '') + (form.lastname?.[0] || '')).toUpperCase() || 'U'
  );

  useEffect(() => {
    const fetchUserData = async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      try {
        setLoadingInitial(true);
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userId = payload.userId;

        const res = await axios.get(`${API_URL}/users/${userId}`);
        setForm({
          name: res.data.name || '',
          lastname: res.data.lastname || '',
          username: res.data.username || '', // populate username
          email: res.data.email || '',
          phone_nr: res.data.phone_nr || '',
        });

        // Probe profile image endpoint — set URI only if it exists
        try {
          const imgUrl = `${API_URL}/users/${userId}/profile-image`;
          await axios.get(imgUrl, { responseType: 'arraybuffer' });
          setProfileImageUri(imgUrl + `?t=${Date.now()}`); // cache-bust
        } catch (e) {
          setProfileImageUri(null);
        }
      } catch (err) {
        console.error('Fetch profile error:', err);
        Alert.alert('Error', 'Failed to load profile data');
      } finally {
        setLoadingInitial(false);
      }
    };

    fetchUserData();
  }, []);

  // remove handleSave and renderField — profile is no longer editable
  // Logout
  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm({ ...form, [field]: value });
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

  return (
    <SafeAreaView style={styles.wrapper}>
      <LoadingOverlay visible={loadingInitial} text="Loading profile..." />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>My Profile</Text>

        {/* Profile summary section (no white background) */}
        <View style={styles.section}>
          {/* removed edit toggle button */}

          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              {profileImageUri ? (
                <Image
                  source={{ uri: profileImageUri }}
                  style={{ width: 56, height: 56, borderRadius: 28 }}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.avatarText}>{initials}</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{fullName || 'Unnamed User'}</Text>
              {/* show username (if available) then email */}
              <Text style={styles.profileEmail}>{form.username || 'No username set'}</Text>
              <Text style={styles.profileEmail}>{form.email || 'No email set'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Username detail row */}
          <View style={styles.detailRow}>
            <Ionicons name="at-outline" size={20} color={Colors.primary} style={styles.detailIcon} />
            <Text style={styles.detailLabel}>Username</Text>
            <Text style={styles.detailValue}>{form.username || '-'}</Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="person-outline" size={20} color={Colors.primary} style={styles.detailIcon} />
            <Text style={styles.detailLabel}>First name</Text>
            <Text style={styles.detailValue}>{form.name || '-'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="person-outline" size={20} color={Colors.primary} style={styles.detailIcon} />
            <Text style={styles.detailLabel}>Last name</Text>
            <Text style={styles.detailValue}>{form.lastname || '-'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="mail-outline" size={20} color={Colors.primary} style={styles.detailIcon} />
            <Text style={styles.detailLabel}>Email</Text>
            <Text style={styles.detailValue}>{form.email || '-'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={20} color={Colors.primary} style={styles.detailIcon} />
            <Text style={styles.detailLabel}>Phone</Text>
            <Text style={styles.detailValue}>{form.phone_nr || '-'}</Text>
          </View>

          {/* Inline logout button moved here */}
          <TouchableOpacity style={styles.logoutInlineBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color={'#FF3B30'} style={{ marginRight: Spacing(1) }} />
            <Text style={styles.logoutInlineTxt}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* removed edit card/UI completely */}

      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = () =>
  StyleSheet.create({
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
      fontSize: 42,
      textAlign: 'center',
      marginBottom: Spacing(3),
      color: Colors.textPrimary,
    },
    card: {
      backgroundColor: Colors.surface,
      borderRadius: 16,
      padding: Spacing(4),
      marginBottom: Spacing(6),
      elevation: 4,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      position: 'relative',
      borderWidth: 1,
      borderColor: Colors.border,
    },
    // New transparent section that preserves spacing/layout
    section: {
      padding: Spacing(4),
      marginBottom: Spacing(6),
      position: 'relative',
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderRadius: 16,
    },
    // New section divider styles
    sectionDivider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing(4),
      marginTop: -Spacing(2),
    },
    sectionDividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: Colors.border,
    },
    sectionDividerIcon: {
      marginHorizontal: Spacing(2),
    },
    editIcon: {
      position: 'absolute',
      top: Spacing(2),
      right: Spacing(2),
      zIndex: 1,
    },
    profileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing(3),
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: Colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing(3),
      borderWidth: 1,
      borderColor: Colors.border,
    },
    avatarText: {
      fontFamily: 'Dongle-Bold',
      fontSize: 28,
      color: Colors.primary,
    },
    profileName: {
      fontFamily: 'Dongle-Bold',
      fontSize: 34,
      color: Colors.textPrimary,
      lineHeight: 36,
    },
    profileEmail: {
      fontFamily: 'Dongle-Regular',
      fontSize: 24,
      color: Colors.textSecondary,
    },
    divider: {
      height: 1,
      backgroundColor: Colors.border,
      marginVertical: Spacing(2),
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing(1),
    },
    detailIcon: {
      marginRight: Spacing(2),
    },
    detailLabel: {
      fontFamily: 'Dongle-Regular',
      fontSize: 26,
      color: Colors.textSecondary,
      width: 120,
    },
    detailValue: {
      fontFamily: 'Dongle-Regular',
      fontSize: 26,
      color: Colors.textPrimary,
      flexShrink: 1,
    },
    row: {
      marginBottom: Spacing(3),
    },
    inputLabel: {
      fontFamily: 'Dongle-Bold',
      fontSize: 26,
      color: Colors.textSecondary,
      marginBottom: Spacing(1),
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: Colors.border,
      borderRadius: 10,
      backgroundColor: Colors.surface,
      paddingHorizontal: Spacing(2),
    },
    inputIcon: {
      marginRight: Spacing(1),
    },
    input: {
      flex: 1,
      paddingVertical: Spacing(2),
      fontSize: 22,
      fontFamily: 'Dongle-Regular',
      color: Colors.textPrimary,
    },
    saveBtn: {
      marginTop: Spacing(2),
      alignSelf: 'center',
      backgroundColor: Colors.primary,
      paddingHorizontal: Spacing(6),
      paddingVertical: Spacing(2),
      borderRadius: 10,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      minWidth: 180,
    },
    logoutInlineBtn: {
      marginTop: Spacing(3),
      alignSelf: 'flex-start',
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: '#FF3B30',
      paddingHorizontal: Spacing(3),
      paddingVertical: Spacing(1),
      borderRadius: 999,
      flexDirection: 'row',
      alignItems: 'center',
    },
    logoutTxt: {
      color: '#FF3B30',
    },
    logoutInlineTxt: {
      color: '#FF3B30',
      fontFamily: 'Dongle-Bold',
      fontSize: 22,
    },
    saveTxt: {
      color: Colors.surface,
      fontSize: 24,
      fontFamily: 'Dongle-Bold',
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing(2),
    },
    cardHeaderTitle: {
      fontFamily: 'Dongle-Bold',
      fontSize: 30,
      color: Colors.textPrimary,
      marginBottom: Spacing(1),
    },
    cardTitle: {
      fontFamily: 'Dongle-Bold',
      fontSize: 32,
      color: Colors.textPrimary,
    },
    countBadge: {
      marginLeft: Spacing(2),
      paddingHorizontal: Spacing(2),
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: Colors.background,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    countBadgeText: {
      fontFamily: 'Dongle-Bold',
      fontSize: 22,
      color: Colors.textSecondary,
      lineHeight: 24,
    },
    cardActions: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 'auto',
    },
    homeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing(1),
    },
    itemDivider: {
      height: 1,
      backgroundColor: Colors.border,
      marginLeft: 28,
    },
    homeEditRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing(1),
      paddingHorizontal: Spacing(1),
      borderRadius: 8,
      backgroundColor: Colors.surface,
    },
    homeName: {
      fontFamily: 'Dongle-Regular',
      fontSize: 26,
      color: Colors.textPrimary,
      flexShrink: 1,
    },
    emptyText: {
      textAlign: 'center',
      color: Colors.textSecondary,
      fontFamily: 'Dongle-Regular',
      fontSize: 24,
      marginTop: Spacing(2),
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing(4),
    },
    modalContent: {
      backgroundColor: Colors.surface,
      padding: Spacing(5),
      borderRadius: 12,
      width: '100%',
      maxWidth: 420,
      alignItems: 'stretch',
      borderWidth: 1,
      borderColor: Colors.border,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing(1),
    },
    modalClose: {
      padding: Spacing(1),
      marginRight: -Spacing(1),
    },
    modalTitle: {
      fontFamily: 'Dongle-Bold',
      fontSize: 32,
      color: Colors.textPrimary,
    },
    modalSubtitle: {
      fontFamily: 'Dongle-Regular',
      fontSize: 22,
      color: Colors.textSecondary,
      marginBottom: Spacing(3),
    },
    modalFieldLabel: {
      fontFamily: 'Dongle-Bold',
      fontSize: 24,
      color: Colors.textSecondary,
      marginBottom: Spacing(1),
    },
    modalActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      marginTop: Spacing(3),
    },
    actionBtn: {
      paddingHorizontal: Spacing(4),
      paddingVertical: Spacing(1),
      borderRadius: 10,
      borderWidth: 1,
      minWidth: 120,
      alignItems: 'center',
      marginLeft: Spacing(2),
    },
    actionBtnText: {
      fontFamily: 'Dongle-Bold',
      fontSize: 22,
    },
    primaryBtn: {
      backgroundColor: Colors.primary,
      borderColor: Colors.primary,
    },
    primaryBtnText: {
      color: Colors.surface,
    },
    secondaryBtn: {
      backgroundColor: 'transparent',
      borderColor: Colors.border,
    },
    secondaryBtnText: {
      color: Colors.textPrimary,
    },
    dangerBtn: {
      backgroundColor: 'transparent',
      borderColor: '#FF3B30',
    },
    dangerBtnText: {
      color: '#FF3B30',
    },
  });
    