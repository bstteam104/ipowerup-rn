import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

// Screens
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import PlaceholderScreen from '../screens/PlaceholderScreen';
import TabNavigator from './TabNavigator';

const Stack = createNativeStackNavigator();

// Wrapper components for placeholder screens
const NotificationsScreen = (props) => (
  <PlaceholderScreen {...props} route={{params: {screenName: 'Notifications'}}} />
);

const ContactUsScreen = (props) => (
  <PlaceholderScreen {...props} route={{params: {screenName: 'Contact Us'}}} />
);

const TroubleshootingScreen = (props) => (
  <PlaceholderScreen {...props} route={{params: {screenName: 'Troubleshooting'}}} />
);

const TipsScreen = (props) => (
  <PlaceholderScreen {...props} route={{params: {screenName: 'iPower Tips'}}} />
);

const AccountSettingsScreen = (props) => (
  <PlaceholderScreen {...props} route={{params: {screenName: 'Account Settings'}}} />
);

const AppSettingsScreen = (props) => (
  <PlaceholderScreen {...props} route={{params: {screenName: 'App Settings'}}} />
);

const ActivityHistoryScreen = (props) => (
  <PlaceholderScreen {...props} route={{params: {screenName: 'Activity History'}}} />
);

const SubscriptionScreen = (props) => (
  <PlaceholderScreen {...props} route={{params: {screenName: 'Peace of Mind'}}} />
);

const DeviceScanningScreen = (props) => (
  <PlaceholderScreen {...props} route={{params: {screenName: 'Device Scanning'}}} />
);

const TermsAndConditionsScreen = (props) => (
  <PlaceholderScreen {...props} route={{params: {screenName: 'Terms & Conditions'}}} />
);

const PrivacyPolicyScreen = (props) => (
  <PlaceholderScreen {...props} route={{params: {screenName: 'Privacy Policy'}}} />
);

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}>
        {/* Auth Flow */}
        <Stack.Screen 
          name="Splash" 
          component={SplashScreen}
          options={{animation: 'none'}}
        />
        <Stack.Screen 
          name="Login" 
          component={LoginScreen}
          options={{animation: 'fade'}}
        />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="TermsAndConditions" component={TermsAndConditionsScreen} />
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
        
        {/* Main App - Tab Navigator */}
        <Stack.Screen 
          name="TabBar" 
          component={TabNavigator}
          options={{animation: 'fade'}}
        />
        
        {/* Additional Screens */}
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="ContactUs" component={ContactUsScreen} />
        <Stack.Screen name="Troubleshooting" component={TroubleshootingScreen} />
        <Stack.Screen name="Tips" component={TipsScreen} />
        <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
        <Stack.Screen name="AppSettings" component={AppSettingsScreen} />
        <Stack.Screen name="ActivityHistory" component={ActivityHistoryScreen} />
        <Stack.Screen name="Subscription" component={SubscriptionScreen} />
        <Stack.Screen name="DeviceScanning" component={DeviceScanningScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
