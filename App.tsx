import AppNavigator from './navigation/AppNavigator';
import * as Font from 'expo-font';
import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Buffer } from 'buffer';
global.Buffer = Buffer;          // mqtt needs Buffer in global scope


export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      await Font.loadAsync({
        'Dongle-Light': require('./assets/fonts/Dongle-Light.ttf'),
        'Dongle-Regular': require('./assets/fonts/Dongle-Regular.ttf'),
        'Dongle-Bold': require('./assets/fonts/Dongle-Bold.ttf'),
      });
      setFontsLoaded(true);
    }
    loadFonts();
  }, []);

  if (!fontsLoaded) {
    return <View><Text>Loading fonts...</Text></View>; // or return null
  }

  return <AppNavigator />;
}
