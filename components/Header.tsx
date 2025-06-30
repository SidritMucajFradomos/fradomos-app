import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing } from '../constant/Colors';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const Header = () => {
  const navigation = useNavigation<NavigationProp>();
  const isWeb = Platform.OS === 'web';

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  return (
    <View
      style={[
        styles.headerContainer,
        isWeb ? styles.webHeader : styles.mobileHeader,
      ]}
    >
      <View style={styles.iconRow}>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.iconButton}>
          <Ionicons name="person-circle-outline" size={28} color="black" />
          <Text style={styles.iconText}>Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Homes')} style={styles.iconButton}>
          <Ionicons name="home-outline" size={28} color="black" />
          <Text style={styles.iconText}>Homes</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Users')} style={styles.iconButton}>
          <Ionicons name="people-outline" size={28} color="black" />
          <Text style={styles.iconText}>Users</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.iconButton}>
          <Ionicons name="settings-outline" size={28} color="black" />
          <Text style={styles.iconText}>Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.iconButton}>
          <Ionicons name="notifications-outline" size={28} color="black" />
          <Text style={styles.iconText}>Alerts</Text>
        </TouchableOpacity>

      
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
    alignItems: 'center',
  },
  webHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    maxWidth: 640,
    alignSelf: 'center',
    paddingVertical: Spacing(2),
    zIndex: 10,
  },
  mobileHeader: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 50,
    paddingTop: 10,
    zIndex: 10,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    alignItems: 'center',
    marginHorizontal: 20,
  },
  iconText: {
    fontFamily: 'Dongle-Regular',
    fontSize: 20,
    color: 'black',
    marginTop: 2,
  },
});

export default Header;
