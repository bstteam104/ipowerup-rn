import React from 'react';
import {View, Image, StyleSheet, Platform, Text} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import SolarScreen from '../screens/SolarScreen';
import HelpScreen from '../screens/HelpScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

const TabIcon = ({source, focused, label}) => (
  <View style={styles.tabIconContainer}>
    <Image
      source={source}
      style={[
        styles.tabIcon,
        {tintColor: focused ? '#0097D9' : '#999999'}
      ]}
      resizeMode="contain"
    />
    <Text style={[
      styles.tabLabel,
      {color: focused ? '#0097D9' : '#999999'}
    ]}>
      {label}
    </Text>
  </View>
);

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({focused}) => (
            <TabIcon
              source={
                focused
                  ? require('../../assets/tabbar/home-selected.png')
                  : require('../../assets/tabbar/home-unselected.png')
              }
              focused={focused}
              label="Home"
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
              source={
                focused
                  ? require('../../assets/tabbar/solar-selected.png')
                  : require('../../assets/tabbar/solar-unselected.png')
              }
              focused={focused}
              label="Solar"
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
              source={
                focused
                  ? require('../../assets/tabbar/help-selected.png')
                  : require('../../assets/tabbar/help-unselected.png')
              }
              focused={focused}
              label="Help"
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
              source={
                focused
                  ? require('../../assets/tabbar/profile-selected.png')
                  : require('../../assets/tabbar/profile-unselected.png')
              }
              focused={focused}
              label="Profile"
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
    height: Platform.OS === 'ios' ? 85 : 70,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: -3},
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
    paddingBottom: Platform.OS === 'ios' ? 20 : 5,
    paddingTop: 10,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    width: 24,
    height: 24,
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
});

export default TabNavigator;
