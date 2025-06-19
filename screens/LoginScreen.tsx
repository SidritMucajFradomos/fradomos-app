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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import InputField from '../components/InputField';
import PrimaryButton from '../components/PrimaryButton';
import { Colors, Spacing } from '../constant/Colors';
import { RootStackParamList } from '../navigation/AppNavigator';

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

  const handleLogin = () => {
    if (!user || !pass) {
      Alert.alert('Please enter credentials');
      return;
    }
    navigation.replace('Homes');
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
            />
            <InputField
              placeholder="Password"
              secureTextEntry
              value={pass}
              onChangeText={setPass}
            />
            <PrimaryButton
              title="Login"
              onPress={handleLogin}
              style={styles.loginButton}
            />
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
  loginButton: {
    marginTop: Spacing(4),
    paddingHorizontal: Spacing(6),
    minWidth: isWeb ? 200 : undefined,
    alignSelf: 'center',
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
