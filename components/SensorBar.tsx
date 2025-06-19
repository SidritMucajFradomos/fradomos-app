import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import useMqttSensor from '../hooks/useMqttSensor';
import { Colors, Spacing } from '../constant/Colors';

export default function SensorBar() {
  const { temperature, humidity } = useMqttSensor();

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Live Environment</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Temperature:</Text>
        <Text style={styles.value}>
          {temperature !== undefined ? temperature.toFixed(1) : '--'}°C
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Humidity:</Text>
        <Text style={styles.value}>
          {humidity !== undefined ? humidity.toFixed(1) : '--'}%
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: Colors.surface,
    padding: Spacing(4),
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: Spacing(3),
  },
  title: {
    fontFamily: 'Dongle-Bold',
    fontSize: 40,
    marginBottom: Spacing(1),
    color: Colors.textPrimary,
  },
  row: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing(1) },
  label: { fontFamily: 'Dongle-Regular', fontSize: 32, color: Colors.textSecondary },
  value: { fontFamily: 'Dongle-Bold', fontSize: 40, color: Colors.textPrimary, marginLeft: Spacing(2) },
});
