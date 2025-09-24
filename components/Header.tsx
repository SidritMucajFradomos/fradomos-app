import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing } from '../constant/Colors';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const Header = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const current = route?.name || '';

  // Detect theme and derive screen colors
  const scheme = useColorScheme();
  const C = React.useMemo(() => {
    if (scheme === 'dark') {
      return {
        ...Colors,
        background: (Colors as any).backgroundDark ?? '#121212',
        surface: (Colors as any).surfaceDark ?? '#1E1E1E',
        border: (Colors as any).borderDark ?? '#2A2A2A',
        textPrimary: (Colors as any).textPrimaryDark ?? '#FFFFFF',
        textSecondary: (Colors as any).textSecondaryDark ?? '#B0B0B0',
        primary: (Colors as any).primaryDark ?? Colors.primary,
        onPrimary: (Colors as any).onPrimaryDark ?? Colors.onPrimary,
        error: (Colors as any).errorDark ?? Colors.error,
      };
    }
    return Colors;
  }, [scheme]);

  const styles = React.useMemo(() => makeStyles(C), [C]);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const TabButton = ({
    to,
    label,
    icon,
  }: {
    to: keyof RootStackParamList;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  }) => {
    const isActive = current === to;
    const color = isActive ? C.primary : C.textSecondary;
    return (
      <TouchableOpacity
        onPress={() => navigation.navigate(to as any)}
        style={styles.iconButton}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: isActive }}
      >
        <Ionicons name={icon} size={24} color={color} />
        <Text style={[styles.iconText, isActive && styles.iconTextActive]}>{label}</Text>
        {isActive && <View style={styles.activeDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.headerContainer}>
      <View style={styles.iconRow}>
        <TabButton to="Homes" label="Homes" icon="home-outline" />
        <TabButton to="Users" label="Management" icon="grid-outline" />
        <TabButton to="Notifications" label="Alerts" icon="notifications-outline" />
        <TabButton to="Settings" label="Settings" icon="settings-outline" />
        <TabButton to="Profile" label="Profile" icon="person-circle-outline" />
      </View>
    </View>
  );
};

function makeStyles(C: any) {
  return StyleSheet.create({
    headerContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: C.surface,
      borderTopWidth: 1,
      borderColor: C.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 6,
      alignItems: 'center',
      paddingTop: Spacing(1),
      paddingBottom: Spacing(12),
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      zIndex: 100,
    },
    iconRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      maxWidth: 640,
      paddingHorizontal: Spacing(3),
    },
    iconButton: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: Spacing(1),
    },
    iconText: {
      fontFamily: 'Dongle-Regular',
      fontSize: 18,
      color: C.textSecondary,
      marginTop: 0,
    },
    iconTextActive: {
      color: C.primary,
    },
    activeDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: C.primary,
      marginTop: Spacing(0.5),
    },
  });
}

export default Header;
