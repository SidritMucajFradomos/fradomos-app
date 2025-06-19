import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import HomesScreen from '../screens/HomesScreen'; // 🆕 All buildings
import HomeScreen from '../screens/HomeScreen';   // Rooms in one home
import RoomScreen from '../screens/RoomScreen';   // Devices in one room

export type RootStackParamList = {
  Login: undefined;
  Homes: undefined;                    // New screen: list of all homes
  Home: { homeName: string };         // Rooms inside selected home
  Room: { name: string };             // Devices inside selected room
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Homes" component={HomesScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Room" component={RoomScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
