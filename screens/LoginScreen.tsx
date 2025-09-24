import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  Alert,
  SafeAreaView,
  Platform,
  Pressable,
  TextInput,
  Keyboard,
  DeviceEventEmitter, // added
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// Removed LinearGradient
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import InputField from '../components/InputField';
import PrimaryButton from '../components/PrimaryButton';
import { Colors, Spacing } from '../constant/Colors';
import { RootStackParamList } from '../navigation/AppNavigator';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoadingOverlay from '../components/LoadingOverlay';
import ErrorBanner from '../components/ErrorBanner';
import { API_URL } from '../constant/Api';

const MAX_WIDTH = 640;
const { height } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

type LoginScreenNavProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

type Props = {
  navigation: LoginScreenNavProp;
};

export default function LoginScreen({ navigation }: Props) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForm] = useState(true);
  const [navigating, setNavigating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();

  // Listen to theme updates and rebuild styles
  const [themeTick, setThemeTick] = useState(0);
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('appThemeChanged', () =>
      setThemeTick((t) => t + 1)
    );
    return () => sub.remove();
  }, []);
  const styles = React.useMemo(() => createStyles(), [themeTick]);
  const screenStyles = React.useMemo(() => createScreenStyles(), [themeTick]);

  const dismissError = () => setErrorMsg(null);
  const showError = (msg: string) => setErrorMsg(msg);

  // ✅ Auto-redirect if already logged in
  useEffect(() => {
    const checkToken = async () => {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        navigation.replace('Homes');
      }
    };
    checkToken();
  }, []);

  const handleLogin = async () => {
    try {
      const res = await axios.post(`${API_URL}/auth/login`, {
        username: user.trim(),
        password: pass,
      });

      if (res.status === 200 && res.data.token) {
        await AsyncStorage.setItem('token', res.data.token);
        navigation.replace('Homes');
      } else {
        showError('Login failed: Unexpected server response');
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        showError('Incorrect username or password');
      } else if (err.response?.data?.errors) {
        const msg = err.response.data.errors.map((e: any) => e.msg).join('\n');
        showError(msg || 'Validation error');
      } else {
        console.error('Login error:', err);
        showError('Something went wrong. Please try again.');
      }
    }
  };

  return (
    <SafeAreaView style={screenStyles.screenWrapper}>
      <ErrorBanner message={errorMsg} onDismiss={dismissError} />
      <LoadingOverlay visible={navigating} text="Opening signup..." />
      <View style={screenStyles.container}>
        {!showForm ? (
          <View style={styles.splashWrap}>
            <Image
              source={require('../assets/icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        ) : (
          <View style={styles.formCard}>
            <Image
              source={require('../assets/icon.png')}
              style={styles.brandMark}
              resizeMode="contain"
            />
            <Text style={styles.title}>Sign in to your account</Text>

            <InputField
              placeholder="Username"
              value={user}
              onChangeText={setUser}
              style={styles.input}
              returnKeyType="next"
              onSubmitEditing={() => {
                passwordRef.current?.focus();
              }}
              blurOnSubmit={false}
            />

            <TextInput
              ref={passwordRef}
              placeholder="Password"
              secureTextEntry={!showPassword}
              value={pass}
              onChangeText={setPass}
              style={styles.input}
              returnKeyType="done"
              onSubmitEditing={() => {
                Keyboard.dismiss();
                handleLogin();
              }}
              placeholderTextColor="#888"
              autoCapitalize="none"
            />

            {/* Compact row: Forgot + Show toggle */}
            <View style={styles.auxRow}>
              <Pressable onPress={() => Alert.alert('Password reset', 'Password reset flow will be available soon.')}>
                <Text style={styles.auxLinkText}>Forgot password?</Text>
              </Pressable>
              <Pressable onPress={() => setShowPassword(!showPassword)}>
                <Text style={styles.showPassToggle}>
                  {showPassword ? 'Hide password' : 'Show password'}
                </Text>
              </Pressable>
            </View>

            <PrimaryButton
              title="Login"
              onPress={handleLogin}
              style={styles.loginButton}
            />

            <Pressable
              onPress={() => {
                if (navigating) return;
                setNavigating(true);
                setTimeout(() => {
                  navigation.navigate('Signup');
                }, 150);
              }}
              style={styles.signupLink}
            >
              <Text style={styles.signupText}>Don't have an account? Sign up</Text>
            </Pressable>

            {/* Footer help link */}
            <Pressable onPress={() => Alert.alert('Help', 'For assistance, contact support@fradomos.al')} style={styles.footerHelpLink}>
              <Text style={styles.footerHelpText}>Get help</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const createStyles = () =>
  StyleSheet.create({
    splashWrap: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    logo: {
      height: height * 0.16,
      width: '50%',
    },
    brandMark: {
      height: 56,
      width: 56,
      alignSelf: 'center',
      marginBottom: Spacing(2),
    },
    title: {
      fontFamily: 'Dongle-Bold',
      fontSize: 36,
      textAlign: 'center',
      color: Colors.textPrimary,
      marginBottom: Spacing(4),
    },
    formCard: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: Colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: Colors.border,
      padding: Spacing(4),
      elevation: 2,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    },
    input: {
      width: '100%',
      backgroundColor: Colors.surface, // was '#fff'
      borderRadius: 10,
      borderWidth: 1,
      borderColor: Colors.border,
      paddingVertical: Spacing(2),
      paddingHorizontal: Spacing(3),
      fontSize: 20,
      fontFamily: 'Dongle-Regular',
      color: Colors.textPrimary,
      marginBottom: Spacing(2),
    },
    showPassBtn: {
      alignSelf: 'flex-end',
      marginBottom: Spacing(2),
    },
    showPassToggle: {
      fontFamily: 'Dongle-Regular',
      color: Colors.textSecondary,
      fontSize: 20,
      fontWeight: '400',
      textAlign: 'right',
    },
    loginButton: {
      marginTop: Spacing(2),
      paddingHorizontal: Spacing(4),
      minWidth: isWeb ? 200 : undefined,
      alignSelf: 'stretch',
    },
    signupLink: {
      marginTop: Spacing(3),
      alignSelf: 'center',
    },
    signupText: {
      fontFamily: 'Dongle-Regular',
      color: Colors.textSecondary,
      fontSize: 22,
      fontWeight: '600',
    },
    auxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing(2),
    },
    auxLinkText: {
      fontFamily: 'Dongle-Regular',
      color: Colors.textSecondary,
      fontSize: 20,
    },
    footerHelpLink: {
      alignSelf: 'center',
      marginTop: Spacing(2),
    },
    footerHelpText: {
      fontFamily: 'Dongle-Regular',
      color: Colors.textSecondary,
      fontSize: 20,
    },
  });

const createScreenStyles = () =>
  StyleSheet.create({
    screenWrapper: {
      flex: 1,
      alignItems: 'center',
      backgroundColor: Colors.background,
    },
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      maxWidth: MAX_WIDTH,
      alignSelf: 'center',
      paddingHorizontal: Spacing(4),
    },
  });
