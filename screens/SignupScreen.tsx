import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import PrimaryButton from '../components/PrimaryButton';
import { Colors, Spacing } from '../constant/Colors';
import axios from 'axios';

const API_URL = 'http://146.0.23.48:3000'; // ✅ Adjust as needed for your LAN

type SignupScreenNavProp = NativeStackNavigationProp<RootStackParamList, 'Signup'>;

type Props = {
  navigation: SignupScreenNavProp;
};

export default function SignupScreen({ navigation }: Props) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
      console.error('Signup error:', err);

      if (err.response && err.response.data) {
        const data = err.response.data;
        if (data.errors) {
          const messages = data.errors.map((e: any) => e.msg).join('\n');
          Alert.alert('Validation Error', messages);
        } else if (data.error) {
          Alert.alert('Error', data.error);
        } else {
          Alert.alert('Error', JSON.stringify(data));
        }
      } else if (err.request) {
        Alert.alert('Network Error', 'No response from server. Is it running?');
      } else {
        Alert.alert('Error', err.message);
      }
    }
  };

  return (
    <SafeAreaView style={styles.screenWrapper}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <ScrollView contentContainerStyle={styles.scrollInner} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Create Account</Text>

          <TextInput placeholder="First Name" value={firstName} onChangeText={setFirstName} style={styles.input} />
          <TextInput placeholder="Last Name" value={lastName} onChangeText={setLastName} style={styles.input} />
          <TextInput placeholder="Phone Number" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" style={styles.input} />
          <TextInput placeholder="Username" value={username} onChangeText={setUsername} style={styles.input} />
          <TextInput placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" style={styles.input} />
          <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />

          <PrimaryButton
            title={isLoading ? 'Signing Up...' : 'Sign Up'}
            onPress={handleSignup}
            style={styles.signupButton}
            disabled={isLoading}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

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
    paddingHorizontal: Spacing(6),
  },
  scrollInner: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: Spacing(8),
  },
  title: {
    fontFamily: 'Dongle-Bold',
    fontSize: 48,
    textAlign: 'center',
    color: Colors.textPrimary,
    marginBottom: Spacing(6),
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingVertical: Spacing(2),
    paddingHorizontal: Spacing(3),
    fontFamily: 'Dongle-Regular',
    fontSize: 28,
    color: Colors.textPrimary,
    marginBottom: Spacing(4),
    backgroundColor: Colors.surface,
  },
  signupButton: {
    marginTop: Spacing(4),
    paddingHorizontal: Spacing(6),
    minWidth: Platform.OS === 'web' ? 200 : undefined,
    alignSelf: 'center',
  },
});
