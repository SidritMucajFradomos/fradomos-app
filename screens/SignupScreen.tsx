import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  SafeAreaView,
  Pressable,
  Dimensions,
  Keyboard,
  Image,
  DeviceEventEmitter, // added
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import PrimaryButton from '../components/PrimaryButton';
import InputField from '../components/InputField';
import { Colors, Spacing } from '../constant/Colors';
import axios from 'axios';
import ErrorBanner from '../components/ErrorBanner';
import LoadingOverlay from '../components/LoadingOverlay';
import { API_URL } from '../constant/Api';

const MAX_WIDTH = 640;
const { height } = Dimensions.get('window');

type SignupScreenNavProp = NativeStackNavigationProp<RootStackParamList, 'Signup'>;

type Props = {
  navigation: SignupScreenNavProp;
};

export default function SignupScreen({ navigation }: Props) {
  const [showForm] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSignup = async () => {
    if (!username || !email || !password || !firstName || !lastName || !phoneNumber) {
      setErrorMsg('Please fill all fields');
      return;
    }

    try {
      setIsLoading(true);
      const res = await axios.post(`${API_URL}/auth/register`, {
        username,
        password,
        email,
        // backend expects these field names now:
        name: firstName,
        lastname: lastName,
        phone_nr: phoneNumber,
        // profile_image is optional and not sent from this screen
      });

      setIsLoading(false);

      if (res.status === 201) {
        Alert.alert('Success', 'Account created successfully');
        navigation.replace('Login');
      } else {
        setErrorMsg(res.data?.error || 'Signup failed');
      }
    } catch (err: any) {
      setIsLoading(false);
      if (err.response?.data?.errors) {
        const msg = err.response.data.errors.map((e: any) => e.msg).join('\n');
        setErrorMsg(msg || 'Validation error');
      } else if (err.response?.data?.error) {
        setErrorMsg(err.response.data.error);
      } else {
        setErrorMsg('Something went wrong');
        console.error(err);
      }
    }
  };

  // Listen to theme updates and rebuild styles
  const [themeTick, setThemeTick] = useState(0);
  React.useEffect(() => {
    const sub = DeviceEventEmitter.addListener('appThemeChanged', () =>
      setThemeTick((t) => t + 1)
    );
    return () => sub.remove();
  }, []);
  const styles = React.useMemo(() => createStyles(), [themeTick]);
  const screenStyles = React.useMemo(() => createScreenStyles(), [themeTick]);

  return (
    <SafeAreaView style={screenStyles.screenWrapper}>
      <ErrorBanner message={errorMsg} onDismiss={() => setErrorMsg(null)} />
      <LoadingOverlay visible={isLoading} text="Creating account..." />
      <View style={screenStyles.container}>
        {!showForm ? (
          <View style={styles.splashWrap}>
            <Image source={require('../assets/icon.png')} style={styles.logo} resizeMode="contain" />
          </View>
        ) : (
          <View style={styles.formCard}>
            <Image source={require('../assets/icon.png')} style={styles.brandMark} resizeMode="contain" />
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
                {showPassword ? 'Hide password' : 'Show password'}
              </Text>
            </Pressable>

            <PrimaryButton
              title={isLoading ? 'Signing up…' : 'Sign up'}
              onPress={handleSignup}
              style={styles.signupButton}
              disabled={isLoading}
            />

            <Pressable onPress={() => navigation.replace('Login')} style={styles.signupLink}>
              <Text style={styles.signupText}>Already have an account? Login</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const createStyles = () =>
  StyleSheet.create({
    splashWrap: { justifyContent: 'center', alignItems: 'center' },
    logo: { height: height * 0.16, width: '50%' },
    brandMark: { height: 56, width: 56, alignSelf: 'center', marginBottom: Spacing(2) },
    title: {
      fontFamily: 'Dongle-Bold',
      fontSize: 36,
      textAlign: 'center',
      color: Colors.textPrimary,
      marginBottom: Spacing(4),
    },
    formCard: {
      width: '100%',
      maxWidth: 520,
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
    signupButton: {
      marginTop: Spacing(2),
      paddingHorizontal: Spacing(4),
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
  });

const createScreenStyles = () =>
  StyleSheet.create({
    screenWrapper: { flex: 1, alignItems: 'center', backgroundColor: Colors.background },
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
