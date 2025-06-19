// components/RoomCard.tsx
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors, Radius, Spacing } from '../constant/Colors';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Props = {
  name: string;
  devices: number;
  onPress: () => void;
};

export default function RoomCard({ name, devices, onPress }: Props) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <MaterialCommunityIcons name="home-lightbulb" size={32} color={Colors.primary} />
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.subtitle}>{devices} devices</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius,
    padding: Spacing(4),
    margin: Spacing(2),
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  name: {
    marginTop: Spacing(3),
    fontSize: 25,
    fontWeight: '600',
    fontFamily: 'Dongle-Bold',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 21,
    fontFamily: 'Dongle-Regular',
    marginTop: Spacing(1),
    color: Colors.textSecondary,
  },
});
