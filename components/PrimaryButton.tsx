import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radius, Spacing } from '../constant/Colors';

type Props = {
  title: string;
  onPress: () => void;
  style?: ViewStyle;
};

export default function PrimaryButton({ title, onPress, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        pressed && { opacity: 0.85 },
        style,
      ]}>
      <Text style={styles.text}>{title}</Text>
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
  text: {
    color: Colors.surface,
    fontSize: 25,
    fontWeight: '600',
    fontFamily: 'Dongle-Regular',
  },
});
