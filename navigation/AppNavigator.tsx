import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import HomesScreen from '../screens/HomesScreen';
import HomeScreen from '../screens/HomeScreen';
import RoomScreen from '../screens/RoomScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ManagementScreen from '../screens/ManagementScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import AddRoomScreen from '../screens/AddRoomScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PricePlansScreen from '../screens/PricePlansScreen';
import UserManagementScreen from '../screens/UserManagementScreen';
import HomeManagementScreen from '../screens/HomeManagementScreen';
import RoutineScreen from '../screens/RoutineScreen';
import AccountManagementScreen from '../screens/AccountManagementScreen';

import Header from '../components/Header';

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  Homes: undefined;
  Home: { homeId: string; homeName: string };
  Room: { roomId: string; name: string };
  Profile: undefined;
  Users: undefined;
  Settings: undefined;
  Notifications: undefined;
  AddRoom: { homeId: string; homeName: string };
  PricePlans: undefined;
  Routines: undefined;
  AccountManagement: undefined;
  HomeManagement: undefined;
  UserManagement: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const withHeader = (Component: React.ComponentType<any>) => {
  return function WrappedScreen(props: any) {
    return (
      <>
        <Header />
        <Component {...props} />
      </>
    );
  };
};

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
          animation: 'none',
          gestureEnabled: false,
          fullScreenGestureEnabled: false,
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} options={{ animation: 'none', gestureEnabled: false, fullScreenGestureEnabled: false }} />
        <Stack.Screen name="Signup" component={SignupScreen} options={{ animation: 'none', gestureEnabled: false, fullScreenGestureEnabled: false }} />
        <Stack.Screen name="Homes" component={withHeader(HomesScreen)} options={{ animation: 'none', gestureEnabled: false, fullScreenGestureEnabled: false }} />
        <Stack.Screen name="Home" component={withHeader(HomeScreen)} options={{ animation: 'none', gestureEnabled: false, fullScreenGestureEnabled: false }} />
        <Stack.Screen name="Room" component={withHeader(RoomScreen)} options={{ animation: 'none', gestureEnabled: false, fullScreenGestureEnabled: false }} />
        <Stack.Screen name="Profile" component={withHeader(ProfileScreen)} options={{ animation: 'none', gestureEnabled: false, fullScreenGestureEnabled: false }} />
        <Stack.Screen name="Users" component={withHeader(ManagementScreen)} options={{ animation: 'none', gestureEnabled: false, fullScreenGestureEnabled: false }} />
        <Stack.Screen name="Notifications" component={withHeader(NotificationsScreen)} options={{ animation: 'none', gestureEnabled: false, fullScreenGestureEnabled: false }} />
        <Stack.Screen name="Settings" component={withHeader(SettingsScreen)} options={{ animation: 'none', gestureEnabled: false, fullScreenGestureEnabled: false }} />
        <Stack.Screen name="AddRoom" component={withHeader(AddRoomScreen)} options={{ animation: 'none', gestureEnabled: false, fullScreenGestureEnabled: false }} />
        <Stack.Screen
          name="PricePlans"
          component={PricePlansScreen}
          options={{ title: 'Price Plans' }}
        />
        <Stack.Screen name="Routines" component={RoutineScreen} options={{ animation: 'none', gestureEnabled: false, fullScreenGestureEnabled: false }} />
        <Stack.Screen name="AccountManagement" component={AccountManagementScreen} options={{ animation: 'none', gestureEnabled: false, fullScreenGestureEnabled: false }} />
        <Stack.Screen name="HomeManagement" component={HomeManagementScreen} options={{ animation: 'none', gestureEnabled: false, fullScreenGestureEnabled: false }} />
        <Stack.Screen name="UserManagement" component={UserManagementScreen} options={{ animation: 'none', gestureEnabled: false, fullScreenGestureEnabled: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
