import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing } from '../constant/Colors';

// WeatherAPI constants
const WEATHER_API_KEY = 'e5e29c4936df4fff87b160026253006'; // Your API key
const WEATHER_CITY = 'Shkoder'; // Change to desired city

interface Home {
  id: string;
  name: string;
}

export default function HomesScreen({ navigation }: any) {
  const [homes, setHomes] = useState<Home[]>([]);
  const [loading, setLoading] = useState(false);

  // Weather state
  const [weatherTemp, setWeatherTemp] = useState<number | null>(null);
  const [weatherIcon, setWeatherIcon] = useState<string | null>(null);
  const [weatherCondition, setWeatherCondition] = useState<string>('');
  const [weatherLoading, setWeatherLoading] = useState(true);

  const getToken = async () => await AsyncStorage.getItem('token');

  const fetchHomes = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('You must be logged in');

      const res = await fetch(`http://api.fradomos.al:3000/homes`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to fetch homes');

      const data: Home[] = await res.json();
      setHomes(data);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeather = async () => {
    setWeatherLoading(true);
    try {
      const res = await fetch(
        `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${WEATHER_CITY}&aqi=no`
      );
      if (!res.ok) throw new Error('Failed to fetch weather');

      const data = await res.json();

      setWeatherTemp(Math.round(data.current.temp_c));
      // WeatherAPI returns icon URL like "//cdn.weatherapi.com/weather/64x64/day/116.png"
      // Extract icon name (e.g., "partly-sunny") or fallback to Ionicons equivalent
      // For simplicity, map some weather codes to Ionicons names:

      const condition = data.current.condition.text.toLowerCase();

      setWeatherCondition(data.current.condition.text);

      if (condition.includes('sunny') || condition.includes('clear')) {
        setWeatherIcon('sunny-outline');
      } else if (condition.includes('cloud')) {
        setWeatherIcon('cloud-outline');
      } else if (condition.includes('rain')) {
        setWeatherIcon('rainy-outline');
      } else if (condition.includes('storm')) {
        setWeatherIcon('thunderstorm-outline');
      } else if (condition.includes('snow')) {
        setWeatherIcon('snow-outline');
      } else if (condition.includes('fog') || condition.includes('mist')) {
        setWeatherIcon('cloud-outline');
      } else {
        setWeatherIcon('partly-sunny-outline');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
      setWeatherTemp(null);
      setWeatherIcon(null);
    } finally {
      setWeatherLoading(false);
    }
  };

  useEffect(() => {
    fetchHomes();
    fetchWeather();
  }, []);

  function formatDateTime() {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    };
    return now.toLocaleDateString(undefined, options);
  }

  function formatTime() {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
    };
    return now.toLocaleTimeString(undefined, options);
  }

  const renderHome = ({ item }: { item: Home }) => (
    <TouchableOpacity
      style={[styles.card, Platform.OS === 'web' && styles.cardWeb]}
      onPress={() => navigation.navigate('Home', { homeId: item.id, homeName: item.name })}
      activeOpacity={0.85}
    >
      <Ionicons
        name="home-outline"
        size={48}
        color={Colors.primary}
        style={{ marginBottom: Spacing(2) }}
      />
      <Text style={styles.homeName} numberOfLines={2} textAlign="center">
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.screenWrapper, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screenWrapper}>
      <View style={styles.container}>
        <View style={styles.weatherCard}>
          {weatherLoading ? (
            <ActivityIndicator size="large" color="#3A85FF" />
          ) : (
            <>
              <Ionicons name={weatherIcon || 'partly-sunny-outline'} size={70} color="#3A85FF" />
              <Text style={styles.temperature}>{weatherTemp !== null ? weatherTemp : '--'}°C</Text>
              <Text style={styles.city}>{WEATHER_CITY}</Text>
              <Text style={styles.date}>{formatDateTime()}</Text>
              <Text style={styles.time}>{formatTime()}</Text>
            </>
          )}
        </View>

        <Text style={styles.title}>My Homes</Text>

        {homes.length === 0 ? (
          <Text style={styles.noHomesText}>You have no homes yet.</Text>
        ) : (
          <FlatList
            data={homes}
            keyExtractor={(item) => item.id}
            renderItem={renderHome}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalListContainer}
            snapToInterval={280}
            decelerationRate="fast"
            snapToAlignment="start"
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    padding: Spacing(4),
  },
  weatherCard: {
    backgroundColor: '#E6F2FF',
    borderRadius: 24,
    paddingVertical: Spacing(6),
    paddingHorizontal: Spacing(5),
    marginBottom: Spacing(6),
    marginTop: Spacing(6),
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing(2),
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  temperature: {
    fontFamily: 'Dongle-Bold',
    fontSize: 72,
    color: '#3A85FF',
    marginBottom: Spacing(0.5),
  },
  city: {
    fontFamily: 'Dongle-Bold',
    fontSize: 28,
    color: Colors.textPrimary,
    marginBottom: Spacing(0.5),
  },
  date: {
    fontFamily: 'Dongle-Regular',
    fontSize: 20,
    color: Colors.textSecondary,
  },
  time: {
    fontFamily: 'Dongle-Bold',
    fontSize: 36,
    color: Colors.textPrimary,
    marginTop: Spacing(3),
    textAlign: 'center',
  },
  title: {
    fontFamily: 'Dongle-Bold',
    fontSize: 48,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginVertical: Spacing(3),
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    width: 260,
    height: 200,
    marginHorizontal: Spacing(2),
    padding: Spacing(4),
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardWeb: {
    cursor: 'pointer',
  } as any,
  homeName: {
    fontFamily: 'Dongle-Regular',
    fontSize: 36,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  noHomesText: {
    marginTop: Spacing(10),
    fontFamily: 'Dongle-Regular',
    fontSize: 28,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  horizontalListContainer: {
    paddingHorizontal: Spacing(3),
    paddingBottom: Spacing(6),
  },
});
