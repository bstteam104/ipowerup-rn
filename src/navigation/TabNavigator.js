import React from 'react';
import {View, Image, StyleSheet, Platform, Text} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import SolarScreen from '../screens/SolarScreen';
import HelpScreen from '../screens/HelpScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

// Tab icon - uses selected images directly (they already have blue background + icon + label built-in)
const TabIcon = ({selectedIconSource, unselectedIconSource, label, focused}) => (
  <View style={styles.tabIconContainer}>
    {focused ? (
      // Active tab: use selected image which already has blue background, icon, and label
      <Image
        source={selectedIconSource}
        style={styles.tabIconSelected}
        resizeMode="contain"
      />
    ) : (
      // Inactive tab: just icon
      <Image
        source={unselectedIconSource}
        style={styles.tabIcon}
        resizeMode="contain"
      />
    )}
  </View>
);

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false, // We'll show labels manually for active tabs only
        tabBarActiveTintColor: '#32ADE6', // Light cyan/blue matching iOS systemCyanColor
        tabBarInactiveTintColor: '#999999', // Gray for inactive
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({focused}) => (
            <TabIcon
              selectedIconSource={require('../../assets/tabbar/homeTab.png')}
              unselectedIconSource={require('../../assets/tabbar/homeUnselected.png')}
              label="Home"
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
              selectedIconSource={require('../../assets/tabbar/solarTab.png')}
              unselectedIconSource={require('../../assets/tabbar/solarUnselected.png')}
              label="Solar"
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
              selectedIconSource={require('../../assets/tabbar/helpTab.png')}
              unselectedIconSource={require('../../assets/tabbar/helpUnselected.png')}
              label="Help"
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
              selectedIconSource={require('../../assets/tabbar/profileTab.png')}
              unselectedIconSource={require('../../assets/tabbar/profileUnselected.png')}
              label="Profile"
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
  tabIconSelected: {
    // Selected images already contain blue background + icon + label
    // Match iOS selected tab image dimensions: width 77, height 28
    width: 77,
    height: 28,
  },
});

export default TabNavigator;
