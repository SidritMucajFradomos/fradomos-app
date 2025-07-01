import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  SafeAreaView,
  Animated,
  Platform,
  Pressable,
  Dimensions,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import PrimaryButton from '../components/PrimaryButton';
import InputField from '../components/InputField';
import { Colors, Spacing } from '../constant/Colors';
import axios from 'axios';

const MAX_WIDTH = 640;
const API_URL = 'http://api.fradomos.al:3000';

type SignupScreenNavProp = NativeStackNavigationProp<RootStackParamList, 'Signup'>;

type Props = {
  navigation: SignupScreenNavProp;
};

export default function SignupScreen({ navigation }: Props) {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [showForm, setShowForm] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowForm(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleSignup = async () => {
    if (!username || !email || !password || !firstName || !lastName || !phoneNumber) {
      Alert.alert('Please fill all fields');
      return;
    }

    try {
      setIsLoading(true);
      const res = await axios.post(`${API_URL}/auth/register`, {
        username,
        password,
        email,
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
      });

      setIsLoading(false);

      if (res.status === 201) {
        Alert.alert('Success', 'Account created successfully');
        navigation.replace('Login');
      } else {
        Alert.alert('Signup failed', res.data.error || 'Unknown error');
      }
    } catch (err: any) {
      setIsLoading(false);
      if (err.response?.data?.errors) {
        const msg = err.response.data.errors.map((e: any) => e.msg).join('\n');
        Alert.alert('Validation Error', msg);
      } else if (err.response?.data?.error) {
        Alert.alert('Error', err.response.data.error);
      } else {
        Alert.alert('Error', 'Something went wrong');
        console.error(err);
      }
    }
  };

  return (
    <LinearGradient colors={['#001636', '#1d3659', '#0252c4']} style={styles.fullScreen}>
      <SafeAreaView style={screenStyles.screenWrapper}>
        {showForm && (
          <Animated.View style={[screenStyles.container, { opacity: fadeAnim }]}>
            <Text style={styles.title}>Create your account</Text>

            <InputField placeholder="First Name" value={firstName} onChangeText={setFirstName} style={styles.input} />
            <InputField placeholder="Last Name" value={lastName} onChangeText={setLastName} style={styles.input} />
            <InputField
              placeholder="Phone Number"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              style={styles.input}
            />
            <InputField placeholder="Username" value={username} onChangeText={setUsername} style={styles.input} />
            <InputField
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />
            <TextInput
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              style={styles.input}
              placeholderTextColor="#888"
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={() => {
                Keyboard.dismiss();
                handleSignup();
              }}
            />

            <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.showPassBtn}>
              <Text style={styles.showPassToggle}>
                {showPassword ? 'Hide Password' : 'Show Password'}
              </Text>
            </Pressable>

            <PrimaryButton
              title={isLoading ? 'Signing Up...' : 'Sign Up'}
              onPress={handleSignup}
              style={styles.signupButton}
              disabled={isLoading}
            />

            <Pressable onPress={() => navigation.replace('Login')} style={styles.signupLink}>
              <Text style={styles.signupText}>Already have an account? Login</Text>
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
  showPassBtn: {
    alignSelf: 'center',
    marginBottom: Spacing(3),
  },
  showPassToggle: {
    fontFamily: 'Dongle-Regular',
    color: Colors.surface,
    fontSize: 28,
    fontWeight: '400',
    textAlign: 'center',
  },
  signupButton: {
    marginTop: Spacing(4),
    paddingHorizontal: Spacing(6),
    alignSelf: 'center',
  },
  signupLink: {
    marginTop: Spacing(4),
    alignSelf: 'center',
  },
  signupText: {
    fontFamily: 'Dongle-Regular',
    color: '#1E90FF',
    fontSize: 28,
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
