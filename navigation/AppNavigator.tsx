// AppNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import HomesScreen from '../screens/HomesScreen';
import HomeScreen from '../screens/HomeScreen';
import RoomScreen from '../screens/RoomScreen';
import ProfileScreen from '../screens/ProfileScreen';
import Header from '../components/Header';

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  Homes: undefined;
  Home: { homeId: string; homeName: string };  // <-- added homeId here
  Room: { name: string };
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const withHeader = (Component: React.ComponentType<any>) => (props: any) => (
  <>
    <Header />
    <Component {...props} />
  </>
);

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="Homes" component={withHeader(HomesScreen)} />
        <Stack.Screen name="Home" component={withHeader(HomeScreen)} />
        <Stack.Screen name="Room" component={withHeader(RoomScreen)} />
        <Stack.Screen name="Profile" component={withHeader(ProfileScreen)} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
