import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import HomesScreen from '../screens/HomesScreen';
import HomeScreen from '../screens/HomeScreen';
import RoomScreen from '../screens/RoomScreen';
import ProfileScreen from '../screens/ProfileScreen';
import UserManagementScreen from '../screens/UserManagementScreen'; // ⬅️ your new user screen
import Header from '../components/Header';
import NotificationsScreen from '../screens/NotificationsScreen';

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  Homes: undefined;
  Home: { homeId: string; homeName: string };
  Room: { name: string };
  Profile: undefined;
  Users: undefined;
  Settings: undefined;
  Notifications: undefined;
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
        <Stack.Screen name="Users" component={withHeader(UserManagementScreen)} />
        {/* Placeholders for Settings and Notifications if not yet built */}
        <Stack.Screen name="Settings" component={withHeader(() => <></>)} />
        <Stack.Screen name="Notifications" component={withHeader(NotificationsScreen)} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
