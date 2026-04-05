import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HotspotProvider } from './context/HotspotContext';
import DashboardScreen from './screens/DashboardScreen';
import DevicesScreen from './screens/DevicesScreen';
import SettingsScreen from './screens/SettingsScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <HotspotProvider>
      <NavigationContainer
        theme={{
          dark: true,
          colors: {
            primary: '#00c853',
            background: '#0a0e27',
            card: '#12162e',
            text: '#ffffff',
            border: '#2d3354',
            notification: '#00c853',
          },
        }}
      >
        <StatusBar barStyle="light-content" backgroundColor="#0a0e27" />
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: '#00c853',
            tabBarInactiveTintColor: '#8b8fa3',
            tabBarStyle: {
              backgroundColor: '#12162e',
              borderTopColor: '#2d3354',
              paddingBottom: 6,
              paddingTop: 6,
              height: 60,
            },
            tabBarLabelStyle: {
              fontSize: 12,
              fontWeight: '600',
            },
          }}
        >
          <Tab.Screen
            name="Dashboard"
            component={DashboardScreen}
            options={{
              tabBarLabel: 'Hotspot',
            }}
          />
          <Tab.Screen
            name="Devices"
            component={DevicesScreen}
            options={{
              tabBarLabel: 'Devices',
            }}
          />
          <Tab.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              tabBarLabel: 'Settings',
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </HotspotProvider>
  );
}
