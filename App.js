import React from 'react';
import Toast from 'react-native-toast-message';
import './src/i18n'; // Initialize i18n
import AppNavigator from './src/navigation/AppNavigator';

const App = () => {
  return (
    <>
      <AppNavigator />
      <Toast />
    </>
  );
};

export default App;
