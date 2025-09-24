import React, { useState, useEffect } from 'react';
import { SafeAreaView, ScrollView, View, Text, StyleSheet, TouchableOpacity, Alert, Appearance, Modal, Switch, DeviceEventEmitter, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../constant/Colors';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_URL, ensureApiUrl } from '../constant/Api';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Home = { id: string; name: string };

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  // General settings state
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [homeModalVisible, setHomeModalVisible] = useState(false);

  const [language, setLanguage] = useState<string>(''); // 'en' | 'sq' | ...
  const [themePref, setThemePref] = useState<'light' | 'dark'>('light');
  const [defaultHome, setDefaultHome] = useState<Home | null>(null);
  const [homes, setHomes] = useState<Home[]>([]);
  // NEW: remote access preference (local only, default false)
  const [remoteEnabled, setRemoteEnabled] = useState(false);

  // Rebuild styles on theme changes
  const [themeTick, setThemeTick] = useState(0);
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('appThemeChanged', () =>
      setThemeTick((t) => t + 1)
    );
    return () => sub.remove();
  }, []);
  const styles = React.useMemo(() => createStyles(), [themeTick]);

  const handlePress = (key: string) => {
    Alert.alert('Coming soon', `${key} settings will be available soon.`);
  };

  const handleDeleteAccount = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('No token');
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.userId;

      await fetch(`${API_URL}/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      await AsyncStorage.removeItem('token');
      setDeleteModalVisible(false);
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      Alert.alert('Account deleted', 'Your account has been deleted.');
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to delete account');
    }
  };

  // Derived current values
  const locale = (Intl as any)?.DateTimeFormat?.().resolvedOptions().locale || 'en';
  const baseLang = String(locale).split('-')[0];
  const langMap: Record<string, string> = {
    en: 'English', sq: 'Albanian', de: 'German', fr: 'French', it: 'Italian', es: 'Spanish',
  };
  // Use saved language if set, otherwise fallback to device locale
  const languageLabel = language
    ? (langMap[language] || language.toUpperCase())
    : `${langMap[baseLang] || baseLang.toUpperCase()}${locale.includes('-') ? ` (${locale})` : ''}`;

  const scheme = Appearance.getColorScheme();
  const themeLabel = themePref === 'dark' ? 'Dark' : 'Light';

  const defaultHomeLabel = defaultHome?.name || 'Not set';
  const pushLabel = 'On';
  const emailLabel = 'Off';
  const criticalLabel = 'On';
  const firmwareLabel = 'Up to date';

  // Load initial values
  const loadHomes = async (): Promise<Home[]> => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return [];
      const res = await fetch(`${API_URL}/homes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const list = (await res.json()) as Home[];
      setHomes(Array.isArray(list) ? list : []);
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  };

  useEffect(() => {
    const init = async () => {
      // language
      const savedLang = await AsyncStorage.getItem('appLanguage');
      if (savedLang) setLanguage(savedLang);

      // theme (only light/dark; if old 'system' value exists, map to device and persist)
      const savedTheme = await AsyncStorage.getItem('themePreference');
      let nextTheme: 'light' | 'dark';
      if (savedTheme === 'light' || savedTheme === 'dark') {
        nextTheme = savedTheme;
      } else {
        const scheme = Appearance.getColorScheme();
        nextTheme = scheme === 'dark' ? 'dark' : 'light';
        await AsyncStorage.setItem('themePreference', nextTheme);
      }
      setThemePref(nextTheme);
      DeviceEventEmitter.emit('appThemeChanged', nextTheme);

      // NEW: load remote access preference
      const savedRemote = await AsyncStorage.getItem('remoteAccessEnabled');
      setRemoteEnabled(savedRemote === 'true');

      // homes and default home
      const savedHomeId = await AsyncStorage.getItem('defaultHomeId');
      const list = await loadHomes();
      if (savedHomeId) {
        const found = list.find(h => String(h.id) === String(savedHomeId)); // compare as strings
        if (found) setDefaultHome(found);
      }
    };
    init();
  }, []);

  // Handlers to select and persist
  const handleSelectLanguage = async (code: string) => {
    setLanguage(code);
    await AsyncStorage.setItem('appLanguage', code);
    setLangModalVisible(false);
  };

  const applyTheme = async (pref: 'light' | 'dark') => {
    setThemePref(pref);
    await AsyncStorage.setItem('themePreference', pref);
    DeviceEventEmitter.emit('appThemeChanged', pref);
  };

  const handleSelectTheme = async (pref: 'light' | 'dark') => {
    await applyTheme(pref);
    setThemeModalVisible(false);
  };

  const handleSelectHome = async (home: Home) => {
    setDefaultHome(home);
    await AsyncStorage.setItem('defaultHomeId', String(home.id)); // ensure string storage
    DeviceEventEmitter.emit('defaultHomeChanged', String(home.id)); // emit as string
    setHomeModalVisible(false);
  };

  // Ask for confirmation before toggling Remote Access and persist if confirmed
  const handleToggleRemoteAttempt = (next: boolean) => {
    Alert.alert(
      'Remote Access',
      `Are you sure you want to turn it ${next ? 'on' : 'off'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            setRemoteEnabled(next);
            await AsyncStorage.setItem('remoteAccessEnabled', next ? 'true' : 'false');
            await ensureApiUrl();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.wrapper}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: Spacing(24) + insets.bottom }]}
        style={styles.scroll}
      >
        <Text style={styles.title}>Settings</Text>

        {/* General Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>
          <TouchableOpacity style={styles.settingButton} onPress={() => setLangModalVisible(true)}>
            <View style={styles.settingLeft}>
              <View style={styles.iconWrap}><Ionicons name="globe-outline" size={18} color={Colors.textSecondary} /></View>
              <Text style={styles.settingLabel}>Language</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.valueText} numberOfLines={1}>{languageLabel}</Text>
              <Ionicons name="chevron-forward-outline" size={18} color={Colors.textSecondary} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingButton} onPress={() => setThemeModalVisible(true)}>
            <View style={styles.settingLeft}>
              <View style={styles.iconWrap}><Ionicons name="color-palette-outline" size={18} color={Colors.textSecondary} /></View>
              <Text style={styles.settingLabel}>App Theme</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.valueText} numberOfLines={1}>{themeLabel}</Text>
              <Ionicons name="chevron-forward-outline" size={18} color={Colors.textSecondary} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingButton} onPress={async () => {
            if (homes.length === 0) await loadHomes();
            setHomeModalVisible(true);
          }}>
            <View style={styles.settingLeft}>
              <View style={styles.iconWrap}><Ionicons name="home-outline" size={18} color={Colors.textSecondary} /></View>
              <Text style={styles.settingLabel}>Default Home</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.valueText} numberOfLines={1}>{defaultHomeLabel}</Text>
              <Ionicons name="chevron-forward-outline" size={18} color={Colors.textSecondary} />
            </View>
          </TouchableOpacity>

          {/* NEW: Remote Access with Switch + confirm dialog */}
          <View style={styles.settingButton}>
            <View style={styles.settingLeft}>
              <View style={styles.iconWrap}>
                <Ionicons name="cloud-outline" size={18} color={Colors.textSecondary} />
              </View>
              <Text style={styles.settingLabel}>Remote Access</Text>
            </View>
            <View style={styles.settingRight}>
              <Text
                style={[
                  styles.valueText,
                  { color: remoteEnabled ? '#34C759' : '#FF3B30' },
                ]}
              >
                {remoteEnabled ? 'On' : 'Off'}
              </Text>
              <Switch
                value={remoteEnabled}
                onValueChange={handleToggleRemoteAttempt}
              />
            </View>
          </View>
        </View>

        {/* Devices Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Devices</Text>
          <TouchableOpacity style={styles.settingButton} onPress={() => handlePress('Device management')}>
            <View style={styles.settingLeft}>
              <View style={styles.iconWrap}><Ionicons name="hardware-chip-outline" size={18} color={Colors.textSecondary} /></View>
              <Text style={styles.settingLabel}>Device Management</Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingButton} onPress={() => handlePress('Firmware updates')}>
            <View style={styles.settingLeft}>
              <View style={styles.iconWrap}><Ionicons name="cloud-download-outline" size={18} color={Colors.textSecondary} /></View>
              <Text style={styles.settingLabel}>Firmware Updates</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.valueText} numberOfLines={1}>{firmwareLabel}</Text>
              <Ionicons name="chevron-forward-outline" size={18} color={Colors.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Security & Privacy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security & Privacy</Text>

          <TouchableOpacity style={styles.settingButton} onPress={() => handlePress('Security PIN')}>
            <View style={styles.settingLeft}>
              <View style={styles.iconWrap}><Ionicons name="shield-checkmark-outline" size={18} color={Colors.textSecondary} /></View>
              <Text style={styles.settingLabel}>Security PIN</Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingButton} onPress={() => handlePress('Two-factor authentication')}>
            <View style={styles.settingLeft}>
              <View style={styles.iconWrap}><Ionicons name="key-outline" size={18} color={Colors.textSecondary} /></View>
              <Text style={styles.settingLabel}>Two‑Factor Authentication</Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingButton} onPress={() => handlePress('Data & privacy')}>
            <View style={styles.settingLeft}>
              <View style={styles.iconWrap}><Ionicons name="lock-closed-outline" size={18} color={Colors.textSecondary} /></View>
              <Text style={styles.settingLabel}>Data & Privacy</Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <TouchableOpacity style={styles.settingButton} onPress={() => handlePress('Push notifications')}>
            <View style={styles.settingLeft}>
              <View style={styles.iconWrap}><Ionicons name="notifications-outline" size={18} color={Colors.textSecondary} /></View>
              <Text style={styles.settingLabel}>Push Notifications</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.valueText} numberOfLines={1}>{pushLabel}</Text>
              <Ionicons name="chevron-forward-outline" size={18} color={Colors.textSecondary} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingButton} onPress={() => handlePress('Email alerts')}>
            <View style={styles.settingLeft}>
              <View style={styles.iconWrap}><Ionicons name="mail-outline" size={18} color={Colors.textSecondary} /></View>
              <Text style={styles.settingLabel}>Email Alerts</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.valueText} numberOfLines={1}>{emailLabel}</Text>
              <Ionicons name="chevron-forward-outline" size={18} color={Colors.textSecondary} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingButton} onPress={() => handlePress('Critical alerts')}>
            <View style={styles.settingLeft}>
              <View style={styles.iconWrap}><Ionicons name="alert-circle-outline" size={18} color={Colors.textSecondary} /></View>
              <Text style={styles.settingLabel}>Critical Alerts</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.valueText} numberOfLines={1}>{criticalLabel}</Text>
              <Ionicons name="chevron-forward-outline" size={18} color={Colors.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Billing Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Billing</Text>
          <TouchableOpacity
            style={styles.settingButton}
            onPress={() => navigation.navigate('PricePlans')}
          >
            <View style={styles.settingLeft}>
              <View style={styles.iconWrap}>
                <Ionicons name="pricetags-outline" size={18} color={Colors.textSecondary} />
              </View>
              <Text style={styles.settingLabel}>Price Plans</Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* About & Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About & Support</Text>
          <TouchableOpacity
            style={styles.settingButton}
            onPress={() => {
              Linking.openURL('https://fradomos.al/help').catch(() =>
                Alert.alert('Error', 'Unable to open help website')
              );
            }}
          >
            <View style={styles.settingLeft}>
              <View style={styles.iconWrap}><Ionicons name="help-circle-outline" size={18} color={Colors.textSecondary} /></View>
              <Text style={styles.settingLabel}>Help & Support</Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingButton} onPress={() => handlePress('Terms of service')}>
            <View style={styles.settingLeft}>
              <View style={styles.iconWrap}><Ionicons name="document-text-outline" size={18} color={Colors.textSecondary} /></View>
              <Text style={styles.settingLabel}>Terms of Service</Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingButton} onPress={() => handlePress('Privacy policy')}>
            <View style={styles.settingLeft}>
              <View style={styles.iconWrap}><Ionicons name="book-outline" size={18} color={Colors.textSecondary} /></View>
              <Text style={styles.settingLabel}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Delete Account */}
        <TouchableOpacity
          style={styles.settingButton}
          onPress={() => setDeleteModalVisible(true)}
          accessibilityLabel="Delete Account"
        >
          <View style={styles.settingLeft}>
            <View style={styles.iconWrap}>
              <Ionicons name="trash-outline" size={18} color={Colors.textSecondary} />
            </View>
            <Text style={[styles.settingLabel, styles.deleteAccountTxt]}>Delete Account</Text>
          </View>
          <Ionicons name="chevron-forward-outline" size={18} color={Colors.textSecondary} />
        </TouchableOpacity>

        {/* Delete Account Modal */}
        <Modal visible={deleteModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Delete Account</Text>
                <TouchableOpacity style={styles.modalClose} onPress={() => setDeleteModalVisible(false)}>
                  <Ionicons name="close-outline" size={24} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalSubtitle}>
                Are you sure you want to delete your account? This action cannot be undone.
              </Text>
              <View style={styles.modalActionsRow}>
                <TouchableOpacity style={[styles.actionBtn, styles.dangerBtn]} onPress={handleDeleteAccount}>
                  <Text style={[styles.actionBtnText, styles.dangerBtnText]}>Delete</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.secondaryBtn]} onPress={() => setDeleteModalVisible(false)}>
                  <Text style={[styles.actionBtnText, styles.secondaryBtnText]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Language Modal */}
        <Modal visible={langModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Language</Text>
                <TouchableOpacity style={styles.modalClose} onPress={() => setLangModalVisible(false)}>
                  <Ionicons name="close-outline" size={24} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalSubtitle}>Choose your app language.</Text>
              {['en','sq','de','fr','it','es'].map(code => (
                <TouchableOpacity key={code} style={styles.optionRow} onPress={() => handleSelectLanguage(code)}>
                  <Text style={styles.optionText}>{langMap[code] || code.toUpperCase()}</Text>
                  {language === code && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
                </TouchableOpacity>
              ))}
              <View style={styles.modalActionsRow}>
                <TouchableOpacity style={[styles.actionBtn, styles.secondaryBtn]} onPress={() => setLangModalVisible(false)}>
                  <Text style={[styles.actionBtnText, styles.secondaryBtnText]}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Theme Modal */}
        <Modal visible={themeModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>App Theme</Text>
                <TouchableOpacity style={styles.modalClose} onPress={() => setThemeModalVisible(false)}>
                  <Ionicons name="close-outline" size={24} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalSubtitle}>Select your preferred theme.</Text>
              {(['light','dark'] as const).map(opt => (
                <TouchableOpacity key={opt} style={styles.optionRow} onPress={() => handleSelectTheme(opt)}>
                  <Text style={styles.optionText}>
                    {opt === 'dark' ? 'Dark' : 'Light'}
                  </Text>
                  {themePref === opt && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
                </TouchableOpacity>
              ))}
              <View style={styles.modalActionsRow}>
                <TouchableOpacity style={[styles.actionBtn, styles.secondaryBtn]} onPress={() => setThemeModalVisible(false)}>
                  <Text style={[styles.actionBtnText, styles.secondaryBtnText]}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Default Home Modal */}
        <Modal visible={homeModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Default Home</Text>
                <TouchableOpacity style={styles.modalClose} onPress={() => setHomeModalVisible(false)}>
                  <Ionicons name="close-outline" size={24} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalSubtitle}>Choose which home opens by default.</Text>
              {homes.length === 0 && (
                <Text style={styles.valueText}>No homes found.</Text>
              )}
              {homes.map(h => (
                <TouchableOpacity key={h.id} style={styles.optionRow} onPress={() => handleSelectHome(h)}>
                  <Text style={styles.optionText}>{h.name}</Text>
                  {defaultHome?.id === h.id && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
                </TouchableOpacity>
              ))}
              <View style={styles.modalActionsRow}>
                <TouchableOpacity style={[styles.actionBtn, styles.secondaryBtn]} onPress={() => setHomeModalVisible(false)}>
                  <Text style={[styles.actionBtnText, styles.secondaryBtnText]}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </ScrollView>
    </SafeAreaView>
  );
}

// Build styles from the current Colors palette on each theme change
const createStyles = () =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
      alignItems: 'center',
      backgroundColor: Colors.background,
    },
    scroll: {
      width: '100%',
    },
    container: {
      flexGrow: 1,
      width: '100%',
      maxWidth: 640,
      alignSelf: 'center',
      padding: Spacing(4),
      paddingBottom: Spacing(20),
    },
    title: {
      fontFamily: 'Dongle-Bold',
      fontSize: 42,
      color: Colors.textPrimary,
      marginBottom: Spacing(2),
    },
    section: {
      width: '100%',
      backgroundColor: Colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: Colors.border,
      padding: Spacing(3),
      marginTop: Spacing(3),
      overflow: 'hidden',
    },
    sectionTitle: {
      fontFamily: 'Dongle-Bold',
      fontSize: 28,
      color: Colors.textPrimary,
      marginBottom: Spacing(1),
    },
    settingButton: {
      alignSelf: 'stretch',
      width: '100%',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: Colors.border,
      backgroundColor: Colors.surface,
      paddingVertical: Spacing(2),
      paddingHorizontal: Spacing(2),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: Spacing(2),
    },
    settingLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    settingRight: {
      flexDirection: 'row',
      alignItems: 'center',
      maxWidth: '50%',
      gap: Spacing(1),
    },
    iconWrap: {
      width: 30,
      height: 30,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: Colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing(2),
      backgroundColor: Colors.surface,
    },
    settingLabel: {
      fontFamily: 'Dongle-Regular',
      fontSize: 24,
      color: Colors.textPrimary,
    },
    valueText: {
      fontFamily: 'Dongle-Regular',
      fontSize: 20,
      color: Colors.textSecondary,
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
      borderColor: Colors.border,
    },
    actionBtnText: {
      fontFamily: 'Dongle-Bold',
      fontSize: 22,
      color: Colors.textPrimary,
    },
    dangerBtn: {
      backgroundColor: 'transparent',
      borderColor: '#FF3B30',
    },
    dangerBtnText: {
      color: '#FF3B30',
    },
    secondaryBtn: {
      backgroundColor: 'transparent',
      borderColor: Colors.border,
    },
    secondaryBtnText: {
      color: Colors.textPrimary,
    },
    deleteAccountTxt: {
      color: '#FF3B30',
    },
    optionRow: {
      paddingVertical: Spacing(1),
      paddingHorizontal: Spacing(2),
      borderRadius: 10,
      borderWidth: 1,
      borderColor: Colors.border,
      backgroundColor: Colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: Spacing(1),
    },
    optionText: {
      fontFamily: 'Dongle-Regular',
      fontSize: 24,
      color: Colors.textPrimary,
    },
  });