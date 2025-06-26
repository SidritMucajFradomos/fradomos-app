import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  Dimensions,
  Alert,
  SafeAreaView,
  Platform,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import InputField from '../components/InputField';
import PrimaryButton from '../components/PrimaryButton';
import { Colors, Spacing } from '../constant/Colors';
import { RootStackParamList } from '../navigation/AppNavigator';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MAX_WIDTH = 640;
const { height } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

// ✅ Use your local network IP here — not localhost for mobile
const API_URL = 'http://146.0.23.48:3000';

type LoginScreenNavProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

type Props = {
  navigation: LoginScreenNavProp;
};

export default function LoginScreen({ navigation }: Props) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowForm(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

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
    if (!user || !pass) {
      Alert.alert('Please enter credentials');
      return;
    }

    try {
      const res = await axios.post(`${API_URL}/auth/login`, {
        username: user.trim(),
        password: pass,
      });

      if (res.status === 200 && res.data.token) {
        await AsyncStorage.setItem('token', res.data.token);
        navigation.replace('Homes');
      } else {
        Alert.alert('Login failed', 'Unexpected response from server');
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        Alert.alert('Login failed', 'Incorrect username or password');
      } else if (err.response?.data?.errors) {
        const msg = err.response.data.errors.map((e: any) => e.msg).join('\n');
        Alert.alert('Validation Error', msg);
      } else {
        console.error('Login error:', err);
        Alert.alert('Login Error', 'Something went wrong. Please try again.');
      }
    }
  };

  return (
    <LinearGradient
      colors={['#001636', '#1d3659', '#0252c4']}
      style={styles.fullScreen}
    >
      <SafeAreaView style={screenStyles.screenWrapper}>
        {!showForm ? (
          <View style={screenStyles.container}>
            <Image
              source={require('../assets/icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        ) : (
          <Animated.View style={[screenStyles.container, { opacity: fadeAnim }]}>
            <Text style={styles.title}>Welcome to Fradomos</Text>

            <InputField
              placeholder="Username"
              value={user}
              onChangeText={setUser}
              style={styles.input}
            />

            <InputField
              placeholder="Password"
              secureTextEntry={!showPassword}
              value={pass}
              onChangeText={setPass}
              style={styles.input}
            />

            <Pressable onPress={() => setShowPassword(!showPassword)}>
              <Text style={styles.showPassToggle}>
                {showPassword ? 'Hide Password' : 'Show Password'}
              </Text>
            </Pressable>

            <PrimaryButton
              title="Login"
              onPress={handleLogin}
              style={styles.loginButton}
            />

            <Pressable onPress={() => navigation.navigate('Signup')} style={styles.signupLink}>
              <Text style={styles.signupText}>Don't have an account? Sign Up</Text>
            </Pressable>
          </Animated.View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
  },
  logo: {
    height: height * 0.2,
    width: '60%',
  },
  title: {
    fontFamily: 'Dongle-Bold',
    fontSize: 48,
    textAlign: 'center',
    color: Colors.surface,
    marginBottom: Spacing(6),
  },
  input: {
    width: 300,
    maxWidth: '90%',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: Spacing(2),
    paddingHorizontal: Spacing(3),
    fontSize: 24,
    fontFamily: 'Dongle-Regular',
    color: Colors.textPrimary,
    marginBottom: Spacing(3),
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  showPassToggle: {
    color: '#ddd',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: Spacing(2),
  },
  loginButton: {
    marginTop: Spacing(4),
    paddingHorizontal: Spacing(6),
    minWidth: isWeb ? 200 : undefined,
    alignSelf: 'center',
  },
  signupLink: {
    marginTop: Spacing(4),
    alignSelf: 'center',
  },
  signupText: {
    color: '#1E90FF',
    fontSize: 18,
    fontWeight: '600',
  },
});

const screenStyles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    maxWidth: MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: Spacing(6),
  },
});
