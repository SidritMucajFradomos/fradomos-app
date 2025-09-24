import React, { useState, useLayoutEffect } from 'react';
import { SafeAreaView, ScrollView, View, Text, StyleSheet, TouchableOpacity, Alert, useWindowDimensions, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../constant/Colors';
import { useNavigation } from '@react-navigation/native';

// New: billing cycle type
type BillingCycle = 'monthly' | 'yearly';

// Updated: only Free and Advanced, euro pricing, monthly/yearly
const plans = [
  {
    id: 'free',
    title: 'Free',
    prices: { monthly: 0, yearly: 0 },
    featured: false,
    features: ['1 home', 'Up to 3 rooms', 'Basic support'],
  },
  {
    id: 'advanced',
    title: 'Advanced',
    prices: { monthly: 15, yearly: 10 },
    featured: true,
    features: ['Unlimited homes', 'Unlimited rooms', 'Automation rules', 'Email support', 'Up to 5 users'],
  },
];

// New: additional plans for more users
const userPacks = [
  { id: 'u10', title: '10 Users', prices: { monthly: 30, yearly: 20 }, features: ['For growing teams'] },
  { id: 'u20', title: '20 Users', prices: { monthly: 50, yearly: 35 }, features: ['For small orgs'] },
  { id: 'u50', title: '50 Users', prices: { monthly: 120, yearly: 80 }, features: ['For businesses'] },
];

export default function PricePlansScreen() {
  const choosePlan = (id: string) => {
    Alert.alert('Coming soon', `Plan "${id}" will be available soon.`);
  };

  // New: billing toggle state
  const [billing, setBilling] = useState<BillingCycle>('monthly');

  const navigation = useNavigation<any>();
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: 'Price Plans',
      // You can uncomment and tweak these if needed to match other pages:
      // headerStyle: { backgroundColor: Colors.background },
      // headerTintColor: Colors.textPrimary,
      // headerTitleStyle: { fontFamily: 'Dongle-Bold' },
    });
  }, [navigation]);

  const { width } = useWindowDimensions();
  const isSmall = width < 360;
  const columns = width >= 600 ? 2 : 1;

  // New: dynamic theme palette
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
      };
    }
    return Colors;
  }, [scheme]);
  const styles = React.useMemo(() => makeStyles(C), [C]);

  // New: stronger compact scaling for small phones
  const compact = width < 400;
  const s = compact ? (width < 340 ? 0.65 : 0.78) : Math.min(width / 430, 0.95);

  return (
    <SafeAreaView style={styles.wrapper}>
      {/* Constrain content to screen width to prevent horizontal overflow */}
      <ScrollView
        style={{ width: '100%' }}
        contentContainerStyle={[
          styles.container,
          {
            padding: Spacing(isSmall ? 2 : 4) * s,
            paddingHorizontal: Spacing(2) * s,
            maxWidth: width,
            alignItems: 'stretch',
          },
        ]}
      >
        <Text style={[styles.title, { fontSize: (isSmall ? 36 : 42) * s }]}>Price Plans</Text>

        {/* New: Billing cycle toggle (smaller paddings) */}
        <View style={styles.billingToggle}>
          <TouchableOpacity
            onPress={() => setBilling('monthly')}
            style={[
              styles.billingButton,
              { paddingVertical: Spacing(0.75) * s, paddingHorizontal: Spacing(2) * s },
              billing === 'monthly' && styles.billingButtonActive,
            ]}
          >
            <Text style={[styles.billingLabel, billing === 'monthly' && styles.billingLabelActive, { fontSize: 20 * s }]}>Monthly</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setBilling('yearly')}
            style={[
              styles.billingButton,
              { paddingVertical: Spacing(0.75) * s, paddingHorizontal: Spacing(2) * s },
              billing === 'yearly' && styles.billingButtonActive,
            ]}
          >
            <Text style={[styles.billingLabel, billing === 'yearly' && styles.billingLabelActive, { fontSize: 20 * s }]}>Yearly</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          {plans.map((p) => (
            <View
              key={p.id}
              style={[
                styles.planCard,
                p.featured && { borderColor: C.primary, shadowOpacity: 0.08 },
                {
                  // Stretch fully in one column; use safe 49% in two columns
                  width: columns === 1 ? '100%' : '49%',
                  alignSelf: 'stretch',
                  padding: Spacing(isSmall ? 3 : 4) * s,
                  marginTop: Spacing(isSmall ? 2 : 3) * s,
                  borderRadius: 14 * s,
                },
              ]}
            >
              <View style={[styles.planHeader, { marginBottom: Spacing(0.5) * s }]}>
                <Text style={[styles.planTitle, { fontSize: (isSmall ? 28 : 34) * s }]}>{p.title}</Text>
                {p.featured && (
                  <View style={[styles.badge, { paddingHorizontal: Spacing(1.25) * s, paddingVertical: 1.5 * s }]}>
                    <Text style={[styles.badgeText, { fontSize: (isSmall ? 16 : 18) * s }]}>Popular</Text>
                  </View>
                )}
              </View>

              <View style={[styles.priceRow, { marginBottom: Spacing(1.25) * s }]}>
                <Text style={[styles.price, { fontSize: (isSmall ? 34 : 40) * s }]}>€{p.prices[billing]}</Text>
                <Text style={[styles.period, { fontSize: (isSmall ? 18 : 22) * s }]}>/mo</Text>
              </View>
              {p.id === 'advanced' && billing === 'yearly' && (
                <Text style={[styles.subPriceText, { fontSize: 16 * s }]}>when billed yearly</Text>
              )}

              <View style={styles.features}>
                {p.features.map((f, idx) => (
                  <View key={idx} style={[styles.featureRow, { marginTop: Spacing(0.75) * s }]}>
                    <Ionicons name="checkmark-circle-outline" size={(isSmall ? 16 : 18) * s} color={C.textSecondary} />
                    <Text style={[styles.featureText, { fontSize: (isSmall ? 18 : 20) * s }]}>{f}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.cta, { paddingVertical: Spacing(isSmall ? 2 : 2.5) * s, marginTop: Spacing(2) * s, borderRadius: 10 * s }]}
                onPress={() => choosePlan(p.id)}
              >
                <Text style={[styles.ctaText, { fontSize: (isSmall ? 22 : 24) * s }]}>Choose {p.title}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* More users section */}
        <Text style={[styles.sectionTitle, { marginTop: Spacing(4) * s, fontSize: 28 * s }]}>More users</Text>
        <View style={styles.grid}>
          {userPacks.map((u) => (
            <View
              key={u.id}
              style={[
                styles.planCard,
                {
                  width: columns === 1 ? '100%' : '49%',
                  alignSelf: 'stretch',
                  padding: Spacing(isSmall ? 3 : 4) * s,
                  marginTop: Spacing(isSmall ? 2 : 3) * s,
                  borderRadius: 14 * s,
                },
              ]}
            >
              <View style={[styles.planHeader, { marginBottom: Spacing(0.5) * s }]}>
                <Text style={[styles.planTitle, { fontSize: (isSmall ? 26 : 30) * s }]}>{u.title}</Text>
              </View>
              <View style={[styles.priceRow, { marginBottom: Spacing(1.25) * s }]}>
                <Text style={[styles.price, { fontSize: (isSmall ? 30 : 36) * s }]}>€{u.prices[billing]}</Text>
                <Text style={[styles.period, { fontSize: (isSmall ? 16 : 20) * s }]}>/mo</Text>
              </View>
              {billing === 'yearly' && <Text style={[styles.subPriceText, { fontSize: 16 * s }]}>when billed yearly</Text>}

              <View style={styles.features}>
                {u.features.map((f, idx) => (
                  <View key={idx} style={[styles.featureRow, { marginTop: Spacing(0.75) * s }]}>
                    <Ionicons name="checkmark-circle-outline" size={(isSmall ? 16 : 18) * s} color={C.textSecondary} />
                    <Text style={[styles.featureText, { fontSize: (isSmall ? 18 : 20) * s }]}>{f}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.cta, { paddingVertical: Spacing(isSmall ? 2 : 2.5) * s, marginTop: Spacing(2) * s, borderRadius: 10 * s }]}
                onPress={() => choosePlan(u.id)}
              >
                <Text style={[styles.ctaText, { fontSize: (isSmall ? 20 : 22) * s }]}>Choose {u.title}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={{ height: Spacing(10) }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Replace the static StyleSheet with a theme-aware factory
function makeStyles(C: any) {
  return StyleSheet.create({
    wrapper: {
      flex: 1,
      alignItems: 'stretch',
      backgroundColor: C.background,
    },
    container: {
      flexGrow: 1,
      width: '100%',
      maxWidth: 640,
      alignSelf: 'stretch',
      padding: Spacing(4),
    },
    title: {
      fontFamily: 'Dongle-Bold',
      fontSize: 42,
      color: C.textPrimary,
      marginBottom: Spacing(2),
    },
    planCard: {
      backgroundColor: C.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: C.border,
      padding: Spacing(4),
      marginTop: Spacing(3),
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
    },
    planHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing(1),
    },
    planTitle: {
      fontFamily: 'Dongle-Bold',
      fontSize: 34,
      color: C.textPrimary,
    },
    badge: {
      marginLeft: Spacing(2),
      paddingHorizontal: Spacing(2),
      paddingVertical: 2,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: 'transparent',
    },
    badgeText: {
      fontFamily: 'Dongle-Regular',
      fontSize: 18,
      color: C.textSecondary,
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginBottom: Spacing(2),
    },
    price: {
      fontFamily: 'Dongle-Bold',
      fontSize: 40,
      color: C.textPrimary,
    },
    period: {
      marginLeft: Spacing(1),
      fontFamily: 'Dongle-Regular',
      fontSize: 22,
      color: C.textSecondary,
    },
    features: {
      marginTop: Spacing(1),
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: Spacing(1),
    },
    featureText: {
      marginLeft: Spacing(2),
      fontFamily: 'Dongle-Regular',
      fontSize: 20,
      color: C.textPrimary,
    },
    cta: {
      marginTop: Spacing(3),
      backgroundColor: C.primary,
      borderRadius: 12,
      paddingVertical: Spacing(2.5),
      alignItems: 'center',
    },
    ctaText: {
      fontFamily: 'Dongle-Bold',
      fontSize: 24,
      color: C.onPrimary,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
      width: '100%',
    },
    billingToggle: {
      flexDirection: 'row',
      alignSelf: 'flex-start',
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 10,
      overflow: 'hidden',
      marginBottom: Spacing(1),
    },
    billingButton: {
      paddingVertical: Spacing(1),
      paddingHorizontal: Spacing(3),
      backgroundColor: 'transparent',
    },
    billingButtonActive: {
      backgroundColor: C.primary,
    },
    billingLabel: {
      fontFamily: 'Dongle-Regular',
      fontSize: 20,
      color: C.textPrimary,
    },
    billingLabelActive: {
      color: C.onPrimary,
    },
    subPriceText: {
      marginTop: 2,
      fontFamily: 'Dongle-Regular',
      color: C.textSecondary,
      fontSize: 16,
    },
    sectionTitle: {
      fontFamily: 'Dongle-Bold',
      fontSize: 28,
      color: C.textPrimary,
    },
  });
}
