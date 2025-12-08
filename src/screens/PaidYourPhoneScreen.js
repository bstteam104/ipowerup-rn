import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
} from 'react-native';
import {Colors, BorderRadius, FontSizes} from '../constants/Constants';

const {width, height} = Dimensions.get('window');

const PaidYourPhoneScreen = ({navigation}) => {
  const handleScan = () => {
    // Navigate to TabBar - matching iOS
    navigation.replace('TabBar');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      
      {/* Corner View with rounded top corners - matching iOS */}
      <View style={styles.cornerView}>
        {/* Back To Previous Screen - matching iOS underline */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backPreviousContainer}
        >
          <Text style={styles.backPreviousText}>Back To Previous Screen</Text>
        </TouchableOpacity>

        {/* Bluetooth Circle View - matching iOS viewBluetooth */}
        <View style={styles.bluetoothCircleContainer}>
          <View style={styles.bluetoothCircle} />
        </View>

        {/* Title */}
        <Text style={styles.title}>Device Scanning</Text>
        <Text style={styles.subtitle}>
          Please wait while we scan for your device
        </Text>

        {/* Scan Button - matching iOS */}
        <TouchableOpacity
          style={styles.scanButton}
          onPress={handleScan}
          activeOpacity={0.8}
        >
          <Text style={styles.scanButtonText}>Scan</Text>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPreviousContainer: {
    position: 'absolute',
    top: 40,
    left: 30,
  },
  backPreviousText: {
    fontSize: FontSizes.medium,
    fontWeight: '500',
    color: Colors.black,
    textDecorationLine: 'underline',
  },
  bluetoothCircleContainer: {
    width: 120,
    height: 120,
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bluetoothCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.cyanBlue,
    opacity: 0.3,
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
  scanButton: {
    width: '100%',
    height: 50,
    backgroundColor: Colors.signInBlue,
    borderRadius: BorderRadius.large,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  scanButtonText: {
    fontSize: FontSizes.large,
    fontWeight: 'bold',
    color: Colors.white,
  },
});

export default PaidYourPhoneScreen;













