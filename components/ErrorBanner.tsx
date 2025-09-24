import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../constant/Colors';

export default function ErrorBanner({
  message,
  onDismiss,
  autoHideMs = 5000,
  style,
}: {
  message?: string | null;
  onDismiss?: () => void;
  autoHideMs?: number;
  style?: ViewStyle;
}) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-500)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (message) {
      slideAnim.setValue(-500);
      Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => dismiss(), autoHideMs);
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  const dismiss = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    Animated.timing(slideAnim, { toValue: -500, duration: 200, useNativeDriver: true }).start(() => {
      onDismiss?.();
    });
  };

  if (!message) return null;

  return (
    <Animated.View
      style={[styles.banner, { top: insets.top + Spacing(2), transform: [{ translateX: slideAnim }] }, style]}
      pointerEvents="box-none"
    >
      <Text style={styles.text} numberOfLines={3}>{message}</Text>
      <Pressable onPress={dismiss} accessibilityLabel="Dismiss error" style={styles.closeBtn}>
        <Text style={styles.closeText}>✕</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 0,
    right: 0,
    marginHorizontal: 0,
    paddingVertical: Spacing(2),
    paddingHorizontal: Spacing(3),
    backgroundColor: '#fdecea',
    borderBottomWidth: 1,
    borderColor: '#f44336',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 200,
  },
  text: {
    flex: 1,
    fontFamily: 'Dongle-Regular',
    fontSize: 20,
    color: '#b00020',
    marginRight: Spacing(2),
  },
  closeBtn: { paddingHorizontal: Spacing(1), paddingVertical: Spacing(0.5), borderRadius: 6 },
  closeText: { fontSize: 18, color: '#b00020' },
});