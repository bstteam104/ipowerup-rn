import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  Switch,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Colors, Constants, FontSizes} from '../constants/Constants';

const AppSettingsScreen = ({navigation}) => {
  const [bluetoothEnabled, setBluetoothEnabled] = useState(false);
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

  const handleBluetoothToggle = async (value) => {
    setBluetoothEnabled(value);
    setIsLoading(true);

    try {
      const response = await fetch(`${Constants.baseURLDev}/update-bluetooth-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data && data.data) {
        const userObj = data.data[0];
        userObj.token = await AsyncStorage.getItem('accessToken');
        await AsyncStorage.setItem('loggedInUser', JSON.stringify(userObj));
        showAlert('Success', data?.messages?.msg?.[0] || 'Settings updated');
      } else {
        const errorMsg = data?.messages?.msg?.[0] || 'Something went wrong';
        showAlert('Error', errorMsg);
        setBluetoothEnabled(!value); // Revert on error
      }
    } catch (error) {
      showAlert('Error', error.message || 'Something went wrong');
      setBluetoothEnabled(!value); // Revert on error
    } finally {
      setIsLoading(false);
    }
  };

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

  const MenuItem = ({icon, title, onPress, showSwitch = false, switchValue, onSwitchChange}) => (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={showSwitch}
    >
      <View style={styles.menuIconContainer}>
        <Image source={icon} style={styles.menuIcon} resizeMode="contain" />
      </View>
      <Text style={styles.menuTitle}>{title}</Text>
      {showSwitch ? (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          trackColor={{false: '#E0E0E0', true: Colors.cyanBlue}}
          thumbColor="#FFFFFF"
          style={{transform: [{scaleX: 0.9}, {scaleY: 0.9}]}}
        />
      ) : (
        <Text style={styles.menuArrow}>→</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
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
          >
            <Image
              source={require('../../assets/icons/back-arrow.png')}
              style={styles.backIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>App Settings</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Menu Items - matching iOS */}
        <View style={styles.menuContainer}>
          <MenuItem
            icon={require('../../assets/profile/app-settings.png')}
            title="Bluetooth"
            showSwitch={true}
            switchValue={bluetoothEnabled}
            onSwitchChange={handleBluetoothToggle}
          />

          <MenuItem
            icon={require('../../assets/profile/notification.png')}
            title="Alert"
            onPress={() => {}}
          />

          <MenuItem
            icon={require('../../assets/profile/app-settings.png')}
            title="Temperature"
            onPress={handleTemperaturePress}
          />

          <MenuItem
            icon={require('../../assets/profile/logout.png')}
            title="Delete Account"
            onPress={handleDeleteAccount}
          />

          <MenuItem
            icon={require('../../assets/profile/app-settings.png')}
            title="Reset Password"
            onPress={handleResetPasswordPress}
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
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backIcon: {
    width: 24,
    height: 24,
    tintColor: Colors.black,
  },
  headerTitle: {
    fontSize: FontSizes.heading,
    fontWeight: 'bold',
    color: Colors.lightBlackColor,
  },
  placeholder: {
    width: 40,
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
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E8F4FC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuIcon: {
    width: 20,
    height: 20,
    tintColor: Colors.cyanBlue,
  },
  menuTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: Colors.lightBlackColor,
  },
  menuArrow: {
    fontSize: 18,
    color: Colors.cyanBlue,
    fontWeight: '600',
  },
});

export default AppSettingsScreen;






