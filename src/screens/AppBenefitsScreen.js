import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import {Colors, BorderRadius, FontSizes} from '../constants/Constants';
import {BleManager} from 'react-native-ble-plx';

const {width, height} = Dimensions.get('window');

const AppBenefitsScreen = ({navigation, route}) => {
  const routing = route?.params?.routing || 'login';
  const [isConnecting, setIsConnecting] = useState(false);
  const [deviceConnected, setDeviceConnected] = useState(false);

  useEffect(() => {
    // Start scanning after 2 seconds
    const timer = setTimeout(() => {
      startBluetoothScanning();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const startBluetoothScanning = () => {
    // Bluetooth scanning logic here
    // This would integrate with react-native-ble-plx
    setIsConnecting(true);
  };

  const showBluetoothAlert = () => {
    Alert.alert(
      'Bluetooth Not Connected',
      'Bluetooth is turned off or not connected. Please turn on Bluetooth in Settings.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Settings',
          onPress: () => {
            // Open settings - platform specific
            if (Platform.OS === 'ios') {
              // Platform settings
            } else {
              // Android settings
            }
          },
        },
      ],
    );
  };

  const handleConnectDevice = () => {
    navigation.navigate('PaidYourPhone');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      
      {/* Corner View with rounded top corners */}
      <View style={styles.cornerView}>
        {/* Back To Previous Screen underline */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backPreviousContainer}
        >
          <Text style={styles.backPreviousText}>Back To Previous Screen</Text>
        </TouchableOpacity>

        {/* Title */}
        <Text style={styles.title}>Connect Your Device</Text>
        <Text style={styles.subtitle}>
          Make sure Bluetooth is enabled and your device is nearby
        </Text>

        {/* Connect Button */}
        <TouchableOpacity
          style={[
            styles.connectButton,
            deviceConnected && styles.connectButtonConnected,
            isConnecting && styles.connectButtonConnecting,
          ]}
          onPress={handleConnectDevice}
          disabled={isConnecting}
          activeOpacity={0.8}
        >
          <Text style={styles.connectButtonText}>
            {deviceConnected
              ? 'Device Connected'
              : isConnecting
              ? 'Connecting...'
              : 'Connect With Device'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  cornerView: {
    flex: 1,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 40,
    paddingHorizontal: 30,
    paddingBottom: 40,
    marginTop: height * 0.2,
  },
  backPreviousContainer: {
    alignSelf: 'flex-start',
    marginBottom: 30,
  },
  backPreviousText: {
    fontSize: FontSizes.medium,
    fontWeight: '500',
    color: Colors.black,
    textDecorationLine: 'underline',
  },
  title: {
    fontSize: FontSizes.title,
    fontWeight: 'bold',
    color: Colors.lightBlackColor,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: FontSizes.large,
    fontWeight: '500',
    color: Colors.grayColor,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  connectButton: {
    width: '100%',
    height: 50,
    backgroundColor: Colors.signInBlue,
    borderRadius: BorderRadius.large,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  connectButtonConnected: {
    backgroundColor: Colors.cyanBlue,
  },
  connectButtonConnecting: {
    opacity: 0.7,
  },
  connectButtonText: {
    fontSize: FontSizes.large,
    fontWeight: 'bold',
    color: Colors.white,
  },
});

export default AppBenefitsScreen;


















