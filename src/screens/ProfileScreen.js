import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Platform,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import ToggleSwitch from 'toggle-switch-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Colors} from '../constants/Constants';
import {useIsFocused} from '@react-navigation/native';
import BLEManager from '../services/BLEManager';
import PermissionModal from '../components/PermissionModal';

const {width, height} = Dimensions.get('window');

const ProfileScreen = ({navigation}) => {
  const [isNotificationEnabled, setIsNotificationEnabled] = useState(true);
  const [isCaseConnected, setIsCaseConnected] = useState(false);
  const [showScanningModal, setShowScanningModal] = useState(false);
  const [allDiscoveredDevices, setAllDiscoveredDevices] = useState([]);
  const isFocused = useIsFocused();
  const scanIntervalRef = useRef(null);

  // Sync BLE connection state when profile screen is focused
  useEffect(() => {
    if (isFocused) {
      setIsCaseConnected(!!BLEManager.isConnected);
    }
  }, [isFocused]);

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    };
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear();
            navigation.reset({index: 0, routes: [{name: 'Login'}]});
          },
        },
      ],
    );
  };

  const MenuItem = ({icon, title, onPress, showArrow = true, rightComponent, showIcon = true, rightIcon}) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      {showIcon && icon && (
        <View style={styles.menuIconContainer}>
          <Image source={icon} style={styles.menuIcon} resizeMode="contain" />
        </View>
      )}
      {!showIcon && <View style={styles.menuIconContainer} />}
      <Text style={styles.menuTitle}>{title}</Text>
      {rightComponent ? rightComponent : (
        showArrow && (
          <Image
            source={rightIcon || require('../../assets/icons/right-arrow-ios.png')}
            style={styles.menuArrow}
            resizeMode="contain"
          />
        )
      )}
    </TouchableOpacity>
  );

  const startScanOnProfile = () => {
    // Open modal on same screen and start BLE scan (no navigation)
    setShowScanningModal(true);
    BLEManager.clearAllDiscoveredDevices();
    setAllDiscoveredDevices([]);
    BLEManager.startScanning();

    // Poll BLEManager for newly discovered devices & connection state
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }
    scanIntervalRef.current = setInterval(() => {
      const devices = BLEManager.getAllDiscoveredDevices();
      setAllDiscoveredDevices([...devices]);

      // If connected, update UI and close modal
      if (BLEManager.isConnected) {
        setIsCaseConnected(true);
        setShowScanningModal(false);
        BLEManager.stopScanning();
        if (scanIntervalRef.current) {
          clearInterval(scanIntervalRef.current);
          scanIntervalRef.current = null;
        }
      }
    }, 1000);
  };

  const handleCloseScanModal = () => {
    setShowScanningModal(false);
    BLEManager.stopScanning();
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
  };

  const handleConnectDeviceFromProfile = (deviceMeta) => {
    if (!deviceMeta?.id) {
      return;
    }
    BLEManager.connectToDeviceById(deviceMeta.id);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Bluetooth scanning popup on Profile (same screen) */}
      <PermissionModal
        visible={showScanningModal}
        onAllow={() => {}}
        onDontAllow={handleCloseScanModal}
        permissionType="bluetooth"
        discoveredDevices={allDiscoveredDevices}
        deviceCount={allDiscoveredDevices.length}
        hasPermissionGranted={true}
        showStaticDevices={false}
        onDevicePress={handleConnectDeviceFromProfile}
      />

      {/* Background Image */}
      <Image
        source={require('../../assets/images/background.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>My Account</Text>
          </View>

          {/* Menu Items */}
          <View style={styles.menuContainer}>
            <MenuItem
              icon={require('../../assets/icons/setting-account.png')}
              title="Account Settings"
              onPress={() => navigation.navigate('AccountSettings')}
            />
            
            <MenuItem
              icon={require('../../assets/icons/bell-notification.png')}
              title="Notifications"
              onPress={() => {}}
              showArrow={false}
              rightComponent={
                <View style={styles.switchContainer}>
                  <ToggleSwitch
                    isOn={isNotificationEnabled}
                    onColor="#000000"
                    offColor="#E0E0E0"
                    size="small"
                    thumbOnStyle={{backgroundColor: '#5CA3CC', width: 22, height: 22, borderRadius: 11}}
                    thumbOffStyle={{backgroundColor: '#5CA3CC', width: 22, height: 22, borderRadius: 11}}
                    onToggle={setIsNotificationEnabled}
                  />
                </View>
              }
            />
            
            <MenuItem
              icon={require('../../assets/icons/setting-account.png')}
              title="App Settings"
              onPress={() => navigation.navigate('AppSettings')}
            />
            
            <MenuItem
              icon={require('../../assets/icons/file-history.png')}
              title="History"
              onPress={() => navigation.navigate('ActivityHistory')}
            />
            
            <MenuItem
              icon={require('../../assets/icons/philosophy-peace.png')}
              title="Peace of Mind Subscription"
              onPress={() => navigation.navigate('Subscription')}
            />
            
            <MenuItem
              title="Log Out"
              onPress={handleLogout}
              showIcon={false}
              rightIcon={require('../../assets/icons/logout-icon.png')}
            />
          </View>

          {/* Device Connection Section */}
          <View style={styles.deviceSection}>
            <Text style={styles.deviceTitle}>
              {isCaseConnected ? 'Case Connected' : 'No Case Connected'}
            </Text>
            <Text style={styles.deviceSubtitle}>
              {isCaseConnected
                ? 'Your iPowerUp Uno case is connected.'
                : 'Searching for the Uno case, or Duo case?'}
            </Text>
            
            <TouchableOpacity
              style={styles.connectButton}
              onPress={startScanOnProfile}
              activeOpacity={0.8}
            >
              <Text style={styles.connectButtonText}>
                {isCaseConnected ? 'Manage Device' : 'Connect New Device'}
              </Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.55,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 50 : 10,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1D2733',
    textAlign: 'center',
  },
  menuContainer: {
    marginHorizontal: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
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
    color: '#1D2733',
  },
  menuArrow: {
    width: 18,
    height: 18,
    tintColor: Colors.black,
  },
  deviceSection: {
    marginHorizontal: 20,
    marginTop: 30,
    alignItems: 'center',
  },
  deviceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D2733',
    marginBottom: 5,
  },
  deviceSubtitle: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 15,
  },
  connectButton: {
    width: '100%',
    height: 50,
    backgroundColor: Colors.progressYellow, // systemYellowColor
    borderRadius: 12, // cornerRadius
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.black,
  },
  switchContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    height: 38,
    width: 50,
  },
});

export default ProfileScreen;
