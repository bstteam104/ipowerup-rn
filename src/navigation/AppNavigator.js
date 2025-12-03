import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

// Screens
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import OtpScreen from '../screens/OtpScreen';
import RecreatePasswordScreen from '../screens/RecreatePasswordScreen';
import AppBenefitsScreen from '../screens/AppBenefitsScreen';
import PaidYourPhoneScreen from '../screens/PaidYourPhoneScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import NotificationDetailScreen from '../screens/NotificationDetailScreen';
import AccountSettingsScreen from '../screens/AccountSettingsScreen';
import AppSettingsScreen from '../screens/AppSettingsScreen';
import ActivityHistoryScreen from '../screens/ActivityHistoryScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import ContactUsScreen from '../screens/ContactUsScreen';
import TroubleshootingScreen from '../screens/TroubleshootingScreen';
import TipsScreen from '../screens/TipsScreen';
import TemperatureScreen from '../screens/TemperatureScreen';
import TermsAndConditionsScreen from '../screens/TermsAndConditionsScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import TabNavigator from './TabNavigator';

const Stack = createNativeStackNavigator();

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
        <Stack.Screen name="Otp" component={OtpScreen} />
        <Stack.Screen name="RecreatePassword" component={RecreatePasswordScreen} />
        <Stack.Screen name="TermsAndConditions" component={TermsAndConditionsScreen} />
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
        
        {/* Device Connection Flow */}
        <Stack.Screen name="AppBenefits" component={AppBenefitsScreen} />
        <Stack.Screen name="PaidYourPhone" component={PaidYourPhoneScreen} />
        
        {/* Main App - Tab Navigator */}
        <Stack.Screen 
          name="TabBar" 
          component={TabNavigator}
          options={{animation: 'fade'}}
        />
        
        {/* Notification Screens */}
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="NotificationDetail" component={NotificationDetailScreen} />
        
        {/* Settings Screens */}
        <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
        <Stack.Screen name="AppSettings" component={AppSettingsScreen} />
        <Stack.Screen name="Temperature" component={TemperatureScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        
        {/* History & Subscription */}
        <Stack.Screen name="ActivityHistory" component={ActivityHistoryScreen} />
        <Stack.Screen name="Subscription" component={SubscriptionScreen} />
        
        {/* Help Screens */}
        <Stack.Screen name="ContactUs" component={ContactUsScreen} />
        <Stack.Screen name="Troubleshooting" component={TroubleshootingScreen} />
        <Stack.Screen name="Tips" component={TipsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
