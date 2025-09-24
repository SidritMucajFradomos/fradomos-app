import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Font, Spacing } from '../constant/Colors';

export default function RoutineScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Routines</Text>
      <Text style={styles.subtitle}>Automate schedules and trigger smart actions.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing(3), justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontFamily: Font.bold, color: Colors.textPrimary, marginBottom: Spacing(2) },
  subtitle: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center' },
});
