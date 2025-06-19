import React from 'react';
import { TextInput, StyleSheet, TextInputProps } from 'react-native';
import { Colors, Radius, Spacing } from '../constant/Colors';

export default function InputField(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={Colors.textSecondary}
      style={styles.input}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: Radius,
    padding: Spacing(4),
    fontSize: 25,
    fontFamily: 'Dongle-Regular',
    marginBottom: Spacing(3),
  },
});
