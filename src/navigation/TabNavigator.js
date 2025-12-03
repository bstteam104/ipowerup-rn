import React from 'react';
import {View, Image, StyleSheet, Platform} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import SolarScreen from '../screens/SolarScreen';
import HelpScreen from '../screens/HelpScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

// Blue indicator bar image (bottom nav.png) - shown below selected tab icon
// All selected tabs use the same blue indicator bar
const IndicatorBar = () => (
  <Image
    source={require('../../assets/tabbar/homeTab.png')}
    style={styles.indicatorBar}
    resizeMode="contain"
  />
);

const TabIcon = ({iconSource, focused}) => (
  <View style={styles.tabIconContainer}>
    <Image
      source={iconSource}
      style={styles.tabIcon}
      resizeMode="contain"
    />
    {focused && <IndicatorBar />}
  </View>
);

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false, // iOS has no labels (title="") - matching iOS exactly
        tabBarActiveTintColor: 'transparent', // Hide default active tint
        tabBarInactiveTintColor: 'transparent', // Hide default inactive tint
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({focused}) => (
            <TabIcon
              iconSource={require('../../assets/tabbar/homeUnselected.png')}
              focused={focused}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Solar"
        component={SolarScreen}
        options={{
          tabBarIcon: ({focused}) => (
            <TabIcon
              iconSource={require('../../assets/tabbar/solarUnselected.png')}
              focused={focused}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Help"
        component={HelpScreen}
        options={{
          tabBarIcon: ({focused}) => (
            <TabIcon
              iconSource={require('../../assets/tabbar/helpUnselected.png')}
              focused={focused}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({focused}) => (
            <TabIcon
              iconSource={require('../../assets/tabbar/profileUnselected.png')}
              focused={focused}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80, // iOS CustomTabBar height = 80 - matching iOS exactly
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20, // iOS roundCorners radius = 20 - matching iOS
    borderTopRightRadius: 20, // iOS roundCorners radius = 20 - matching iOS
    shadowColor: '#000000', // iOS shadowColor = black - matching iOS
    shadowOffset: {width: 0, height: -2}, // iOS shadowOffset = (0, -2) - matching iOS
    shadowOpacity: 0.2, // iOS shadowOpacity = 0.2 - matching iOS
    shadowRadius: 10, // iOS shadowRadius = 10 - matching iOS
    elevation: 20, // Android shadow
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    paddingTop: 10,
    borderTopWidth: 0, // No border
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    position: 'relative',
    paddingTop: 8,
    paddingBottom: 8,
  },
  tabIcon: {
    width: 24,
    height: 24,
  },
  indicatorBar: {
    position: 'absolute',
    bottom: 0, // Position at the very bottom of the tab bar container
    width: 60, // iOS bottom nav indicator width - adjusted for visibility
    height: 4, // Thin indicator bar height - visible blue line
    alignSelf: 'center',
    backgroundColor: 'transparent',
  },
});

export default TabNavigator;
