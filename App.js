import React, {useEffect} from 'react';
import Toast from 'react-native-toast-message';
import './src/i18n';
import AppNavigator from './src/navigation/AppNavigator';
import NotificationService from './src/services/NotificationService';
import {clearAllBleHistory} from './src/storage/BLEHistoryStorage';

const App = () => {
  useEffect(() => {
    // iOS AppDelegate: clear BLE history on cold start before fresh fetch.
    clearAllBleHistory();

    NotificationService.initialize();

    // iOS AppDelegate parity: also prompt after a short launch delay.
    const timer = setTimeout(() => {
      NotificationService.requestAuthorizationIfNeeded();
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <AppNavigator />
      <Toast />
    </>
  );
};

export default App;
