import React, { useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Animated, Image } from 'react-native';
import { Colors, Spacing } from '../constant/Colors';

type Props = {
  visible: boolean;
  text?: string;
};

export default function LoadingOverlay({ visible, text = 'Loading...' }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const halo = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let pulse: Animated.CompositeAnimation | null = null;
    let haloAnim: Animated.CompositeAnimation | null = null;
    if (visible) {
      scale.setValue(1);
      halo.setValue(1);
      pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.08, duration: 600, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      haloAnim = Animated.loop(
        Animated.sequence([
          Animated.timing(halo, { toValue: 1.6, duration: 1200, useNativeDriver: true }),
          Animated.timing(halo, { toValue: 1, duration: 0, useNativeDriver: true }),
        ])
      );
      pulse.start();
      haloAnim.start();
    }
    return () => {
      pulse?.stop?.();
      haloAnim?.stop?.();
    };
  }, [visible]);

  if (!visible) return null;
  return (
    <View style={styles.overlay} pointerEvents="auto">
      <View style={styles.animWrap}>
        <Animated.View style={[styles.halo, { transform: [{ scale: halo }] }]} />
        <Animated.Image source={require('../assets/icon.png')} style={[styles.logo, { transform: [{ scale }] }]} />
      </View>
      {text ? <Text style={styles.text}>{text}</Text> : null}
    </View>
  );
}

const SIZE = 56;

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    padding: Spacing(2),
  },
  animWrap: {
    width: SIZE * 2,
    height: SIZE * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: SIZE * 1.6,
    height: SIZE * 1.6,
    borderRadius: (SIZE * 1.6) / 2,
    backgroundColor: Colors.primary,
    opacity: 0.07,
  },
  logo: {
    width: SIZE,
    height: SIZE,
  },
  text: {
    marginTop: Spacing(2),
    fontFamily: 'Dongle-Regular',
    fontSize: 22,
    color: Colors.textSecondary,
    backgroundColor: 'transparent',
  },
});