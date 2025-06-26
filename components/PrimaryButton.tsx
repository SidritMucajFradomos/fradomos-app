import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radius, Spacing } from '../constant/Colors';

type Props = {
  title: string;
  onPress: () => void;
  style?: ViewStyle;
  disabled?: boolean; // Added disabled prop
};

export default function PrimaryButton({ title, onPress, style, disabled = false }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled} // Disable press events when disabled
      style={({ pressed }) => [
        styles.button,
        pressed && !disabled && { opacity: 0.85 },
        disabled && styles.disabledButton,
        style,
      ]}
    >
      <Text style={[styles.text, disabled && styles.disabledText]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing(3),
    borderRadius: Radius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  text: {
    color: Colors.surface,
    fontSize: 25,
    fontWeight: '600',
    fontFamily: 'Dongle-Regular',
  },
  disabledText: {
    color: '#ccc', // lighter text color when disabled
  },
});
