import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  Alert,
  ScrollView,
  Platform,
  Dimensions,
} from 'react-native';
import ToggleSwitch from 'toggle-switch-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Colors, Constants, FontSizes} from '../constants/Constants';

const {width, height} = Dimensions.get('window');

const MenuItem = React.memo(({icon, title, onPress, showSwitch = false, switchValue, onSwitchChange, iconSize = 30, switchKey}) => (
  <TouchableOpacity
    style={styles.menuItem}
    onPress={onPress}
    activeOpacity={0.7}
    disabled={showSwitch}
  >
    {icon && (
      <View style={styles.menuIconContainer}>
        <Image source={icon} style={[styles.menuIcon, {width: iconSize, height: 24}]} resizeMode="contain" />
      </View>
    )}
    <Text style={styles.menuTitle} numberOfLines={1} ellipsizeMode="tail">{title}</Text>
      {showSwitch ? (
        <View style={styles.switchContainer}>
          <ToggleSwitch
            key={switchKey}
            isOn={switchValue}
            onColor="#000000"
            offColor="#E0E0E0"
            size="small"
            thumbOnStyle={{backgroundColor: '#5CA3CC'}}
            thumbOffStyle={{backgroundColor: '#5CA3CC'}}
            onToggle={onSwitchChange}
          />
        </View>
      ) : (
      <Image
        source={require('../../assets/icons/right-arrow-ios.png')}
        style={styles.menuArrow}
        resizeMode="contain"
      />
    )}
  </TouchableOpacity>
));

const AppSettingsScreen = ({navigation}) => {
  const [bluetoothEnabled, setBluetoothEnabled] = useState(false);
  const [alertEnabled, setAlertEnabled] = useState(false);
  const [subscribeEnabled, setSubscribeEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const userData = await AsyncStorage.getItem('loggedInUser');
      if (userData) {
        const user = JSON.parse(userData);
        setBluetoothEnabled((user.bluetooth ?? 0) !== 0);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const showAlert = (title, message) => {
    Alert.alert(title, message, [{text: 'OK', style: 'default'}]);
  };

  const handleBluetoothToggle = useCallback((value) => {
    console.log('Bluetooth toggle:', value);
    setBluetoothEnabled(value);
    // UI only for now, no API call
  }, []);

  const handleAlertToggle = useCallback((value) => {
    console.log('Alert toggle:', value);
    setAlertEnabled(value);
    // UI only for now, no API call
  }, []);

  const handleSubscribeToggle = useCallback((value) => {
    console.log('Subscribe toggle:', value);
    setSubscribeEnabled(value);
    // UI only for now, no API call
  }, []);

  const handleTemperaturePress = () => {
    navigation.navigate('Temperature');
  };

  const handleResetPasswordPress = () => {
    navigation.navigate('ResetPassword');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const params = {
                udid: Constants.UDID,
                _method: 'delete',
              };

              const response = await fetch(`${Constants.baseURLDev}/delete-account`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(params),
              });

              const data = await response.json();

              if (data && data.success) {
                // Clear all data and navigate to Login - matching iOS signOutOldUser
                await AsyncStorage.clear();
                navigation.reset({
                  index: 0,
                  routes: [{name: 'Login'}],
                });
              } else {
                const errorMsg = data?.messages?.msg?.[0] || 'Something went wrong';
                showAlert('Error', errorMsg);
              }
            } catch (error) {
              showAlert('Error', error.message || 'Something went wrong');
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Background Image */}
      <Image
        source={require('../../assets/images/background.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Image
              source={require('../../assets/icons/back-arrow-ios.png')}
              style={styles.backIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>App Settings</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Menu Items - matching iOS PDF sequence: Reset Password, Delete Account, Case Temperature, Alert, Bluetooth */}
        <View style={styles.menuContainer}>
          <MenuItem
            icon={require('../../assets/icons/reset-password.png')}
            title="Reset Password"
            onPress={handleResetPasswordPress}
          />

          <MenuItem
            icon={require('../../assets/icons/delete-account.png')}
            title="Delete Account"
            onPress={handleDeleteAccount}
          />

          <MenuItem
            icon={require('../../assets/icons/celsius-temperature.png')}
            title="Case Temperature"
            onPress={handleTemperaturePress}
          />

          <MenuItem
            key="alert"
            switchKey="alert-switch"
            icon={require('../../assets/icons/exclamation-alert.png')}
            title="Alert"
            showSwitch={true}
            switchValue={alertEnabled}
            onSwitchChange={handleAlertToggle}
          />

          <MenuItem
            key="bluetooth"
            switchKey="bluetooth-switch"
            icon={require('../../assets/icons/bluetooth-black.png')}
            title="Bluetooth"
            showSwitch={true}
            switchValue={bluetoothEnabled}
            onSwitchChange={handleBluetoothToggle}
          />

          <MenuItem
            key="subscribe"
            switchKey="subscribe-switch"
            icon={require('../../assets/icons/subscribe-messages.png')}
            title="Subscribe to messages"
            showSwitch={true}
            switchValue={subscribeEnabled}
            onSwitchChange={handleSubscribeToggle}
            iconSize={22}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: width,
    height: height,
    opacity: 0.55,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 50 : 10,
    paddingBottom: 30,
  },
  backButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    width: 24,
    height: 24,
    tintColor: Colors.black,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1D2733',
    textAlign: 'center',
  },
  placeholder: {
    width: 24,
  },
  menuContainer: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  menuIconContainer: {
    width: 30,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  menuIcon: {
    width: 30,
    height: 24,
    tintColor: Colors.black,
  },
  menuTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: Colors.lightBlackColor,
    flexShrink: 1,
  },
  menuArrow: {
    width: 18,
    height: 18,
    tintColor: Colors.black,
  },
  switchContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 8,
    height: 38,
    width: 45,
  },
});

export default AppSettingsScreen;









