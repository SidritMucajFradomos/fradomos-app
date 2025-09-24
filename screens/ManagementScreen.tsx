import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Font, Spacing } from '../constant/Colors';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

export default function ManagementScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const styles = React.useMemo(() => createStyles(isDark), [isDark]);

  const ManagementCard = ({
    icon,
    title,
    subtitle,
    onPress,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle: string;
    onPress?: () => void;
  }) => {
    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={onPress}>
        <View style={styles.cardIconWrap}>
          <Ionicons name={icon} size={36} color={Colors.primary} />
        </View>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Management</Text>
      <Text style={styles.subtitle}>Central hub for managing your system</Text>

      <View style={styles.cardGrid}>
        <ManagementCard
          icon="people-outline"
          title="User Management"
          subtitle="Add users, assign roles, and set permissions"
          onPress={() => navigation.navigate('UserManagement')} // Opens UserManagementScreen
        />
        <ManagementCard
          icon="home-outline"
          title="Home Management"
          subtitle="Create homes, organize rooms, and assign ownership"
          onPress={() => navigation.navigate('HomeManagement')} // Opens HomeManagementScreen
        />
        <ManagementCard
          icon="time-outline"
          title="Routines"
          subtitle="Automate schedules and trigger smart actions"
          onPress={() => navigation.navigate('Routines')}
        />
        <ManagementCard
          icon="key-outline"
          title="ACC Management"
          subtitle="Provision keys, access levels, and temporary passes"
          onPress={() => navigation.navigate('AccountManagement')}
        />
      </View>
    </View>
  );
}

const createStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#0B0F13' : Colors.background,
      padding: Spacing(3),
      paddingTop: Spacing(6),
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: { fontSize: 28, fontFamily: Font.bold, color: isDark ? '#FFFFFF' : Colors.textPrimary, marginBottom: Spacing(2) },
    subtitle: { fontSize: 14, color: isDark ? '#AAB4BD' : Colors.textSecondary, marginBottom: Spacing(4) },

    cardGrid: {
      width: '100%',
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: Spacing(3),
    },
    card: {
      width: '48%',
      aspectRatio: 1,
      backgroundColor: isDark ? '#0F1519' : Colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: isDark ? '#1F2A33' : Colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: isDark ? 0.12 : 0.05,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    cardIconWrap: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: isDark ? '#071011' : Colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing(2),
    },
    cardTitle: { fontFamily: Font.bold, fontSize: 16, color: isDark ? '#FFFFFF' : Colors.textPrimary, textAlign: 'center' },
    cardSubtitle: { fontFamily: Font.regular, fontSize: 12, color: isDark ? '#9AA6AE' : Colors.textSecondary, textAlign: 'center', marginTop: Spacing(1) },
  });
