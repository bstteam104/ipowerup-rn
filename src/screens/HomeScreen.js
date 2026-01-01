import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  SafeAreaView,
  Platform,
  ScrollView,
  Alert,
  PermissionsAndroid,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import {useIsFocused} from '@react-navigation/native';
// Use Native Kotlin BLE Manager (exact iOS match)
import BLEManager from '../services/BLEManagerNative';
import {BLE_CONSTANTS} from '../constants/BLEConstants';
import {saveHistoryEntry} from '../storage/HistoryStorage';
import PermissionModal from '../components/PermissionModal';

const {width, height} = Dimensions.get('window');

// Battery images
const getBatteryImage = (level) => {
  if (level >= 90) return require('../../assets/batteries/bat_100.png');
  if (level >= 80) return require('../../assets/batteries/bat_80.png');
  if (level >= 70) return require('../../assets/batteries/bat_70.png');
  if (level >= 60) return require('../../assets/batteries/bat_60.png');
  if (level >= 50) return require('../../assets/batteries/bat_50.png');
  if (level >= 40) return require('../../assets/batteries/bat_40.png');
  if (level >= 30) return require('../../assets/batteries/bat_30.png');
  if (level >= 20) return require('../../assets/batteries/bat_20.png');
  if (level >= 10) return require('../../assets/batteries/bat_10.png');
  return require('../../assets/batteries/bat_0.png');
};

const getTemperatureImage = (tempCelsius, unit = 'celsius') => {
  // Always use Celsius for color determination (iOS BLETemperatureUnit.swift)
  // The image color is based on Celsius value regardless of display unit
  const celsius = tempCelsius;
  
  // iOS BLETemperatureUnit.swift color logic (always use Celsius ranges)
  // Color thresholds are based on Celsius, even when displaying Fahrenheit
  if (celsius < -10) {
    // Purple not available, use blue as fallback
    return require('../../assets/temperature/temp-blue.png');
  }
  if (celsius < -5) {
    return require('../../assets/temperature/temp-blue.png');
  }
  if (celsius < 60) {
    return require('../../assets/temperature/temp-green.png');
  }
  if (celsius < 65) {
    return require('../../assets/temperature/temp-yellow.png');
  }
  if (celsius < 70) {
    return require('../../assets/temperature/temp-orange.png');
  }
  return require('../../assets/temperature/temp-red.png');
};

const HomeScreen = ({navigation, route}) => {
  const isFocused = useIsFocused();
  const [userName, setUserName] = useState('User');
  const [phoneBatteryLevel, setPhoneBatteryLevel] = useState(0);
  const [caseBatteryLevel, setCaseBatteryLevel] = useState(0);
  const [caseTemperature, setCaseTemperature] = useState(0);
  const [temperatureUnit, setTemperatureUnit] = useState('celsius');
  const [isCharging, setIsCharging] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [hasBluetoothPermission, setHasBluetoothPermission] = useState(false);
  const [showScanningModal, setShowScanningModal] = useState(false); // Scanning modal after permission
  const [allDiscoveredDevices, setAllDiscoveredDevices] = useState([]); // Devices for scanning modal
  const [chargeConfigEnabled, setChargeConfigEnabled] = useState(false); // Phone charging enabled in config
  const [phoneCharging, setPhoneCharging] = useState(false); // Actual phone charging status from PowerBankStatus
  const [usbCharging, setUsbCharging] = useState(false); // USB charging status from PowerBankStatus
  const batteryIntervalRef = useRef(null);

  // Get phone battery level
  const getPhoneBatteryLevel = async () => {
    try {
      const level = await DeviceInfo.getBatteryLevel();
      const percent = Math.round(level * 100);
      setPhoneBatteryLevel(percent);
      return percent;
    } catch (error) {
      console.error('Error getting battery:', error);
      return 0;
    }
  };

  // Check Bluetooth permissions (without requesting)
  const checkBluetoothPermissions = async () => {
    try {
      if (Platform.OS === 'android') {
        const androidVersion = Platform.Version;
        if (androidVersion >= 31) {
          // Android 12+ (API 31+) - Check permissions first
          const scanCheck = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN);
          const connectCheck = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
          const locationCheck = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
          
          if (scanCheck && connectCheck && locationCheck) {
            setHasBluetoothPermission(true);
            return true;
          } else {
            // Permission not granted - show modal
            return false;
          }
        } else {
          // Android 11 and below - Check location permission
          const locationCheck = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
          
          if (locationCheck) {
            setHasBluetoothPermission(true);
            return true;
          } else {
            // Permission not granted - show modal
            return false;
          }
        }
      } else {
        // Permissions are handled automatically via Info.plist
        setHasBluetoothPermission(true);
        return true;
      }
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  };

  // Request Bluetooth permissions directly
  const requestBluetoothPermissions = async () => {
    try {
      if (Platform.OS === 'android') {
        const androidVersion = Platform.Version;
        if (androidVersion >= 31) {
          // Android 12+ (API 31+) - Direct native permission request
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ]);
          
          const allGranted = 
            granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED &&
            granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED &&
            granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;
          
          if (allGranted) {
            setHasBluetoothPermission(true);
            // Show scanning modal after permission granted
            setShowScanningModal(true);
            // Check and enable Bluetooth, then setup BLE
            checkAndEnableBluetooth().then(() => {
              setupBLEManager();
            }).catch(() => {
              setupBLEManager();
            });
          } else {
            Alert.alert(
              'Permission Denied',
              'Bluetooth permission is required. Please enable it in Settings.',
              [
                {text: 'Cancel', style: 'cancel'},
                {text: 'Open Settings', onPress: () => Linking.openSettings()},
              ]
            );
          }
        } else {
          // Android 11 and below - Direct native permission request
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
          );
          
          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            setHasBluetoothPermission(true);
            // Show scanning modal after permission granted
            setShowScanningModal(true);
            // Check and enable Bluetooth, then setup BLE
            checkAndEnableBluetooth().then(() => {
              setupBLEManager();
            }).catch(() => {
              setupBLEManager();
            });
          } else {
            Alert.alert(
              'Permission Denied',
              'Location permission is required for Bluetooth. Please enable it in Settings.',
              [
                {text: 'Cancel', style: 'cancel'},
                {text: 'Open Settings', onPress: () => Linking.openSettings()},
              ]
            );
          }
        }
      } else {
        // Permissions handled automatically by system
        setHasBluetoothPermission(true);
        // Show scanning modal after permission granted
        setShowScanningModal(true);
        checkAndEnableBluetooth().then(() => {
          setupBLEManager();
        }).catch(() => {
          setupBLEManager();
        });
      }
    } catch (error) {
      console.error('Permission request error:', error);
      Alert.alert(
        'Error',
        'Failed to request permissions. Please try again or enable in Settings.',
        [{text: 'OK'}]
      );
    }
  };

  // Check Bluetooth state and show alert if OFF (pure BLE library, no native module)
  const checkAndEnableBluetooth = async () => {
    try {
      const state = await BLEManager.getBluetoothState();
      console.log('📶 Current Bluetooth state:', state);
      
      if (state === 'PoweredOff') {
        Alert.alert(
          'Bluetooth is Off',
          'Bluetooth needs to be enabled to scan for devices. Please enable it in Settings.',
          [
            {text: 'Cancel', style: 'cancel'},
            {
              text: 'Open Settings',
              onPress: () => Linking.openSettings(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error checking/enabling Bluetooth:', error);
      throw error; // Re-throw to handle in promise chain
    }
  };

  useEffect(() => {
    // Load user data
    loadUserData();
    
    // Get initial phone battery
    getPhoneBatteryLevel();
    
    // Sync connection state on mount
    setIsConnected(!!BLEManager.isConnected);
    
    // Check permissions and request if needed
    checkBluetoothPermissions().then((hasPermission) => {
      if (hasPermission) {
        // Permission already granted - setup BLE and start scanning immediately
        console.log('✅ Permissions already granted, starting BLE scan...');
        setupBLEManager();
      } else {
        // Request permissions directly
        console.log('⏳ Requesting Bluetooth permissions...');
        requestBluetoothPermissions();
      }
    });
    
    // Periodic battery check (react-native-device-info doesn't have listener, so we poll)
    batteryIntervalRef.current = setInterval(() => {
      getPhoneBatteryLevel();
    }, 5000);
    
    // Sync connection state periodically (in case it changes externally)
    const connectionSyncInterval = setInterval(() => {
      const currentConnected = !!BLEManager.isConnected;
      if (currentConnected !== isConnected) {
        setIsConnected(currentConnected);
      }
    }, 2000);
    
    // Cleanup
    return () => {
      if (batteryIntervalRef.current) {
        clearInterval(batteryIntervalRef.current);
      }
      if (connectionSyncInterval) {
        clearInterval(connectionSyncInterval);
      }
      BLEManager.stopPeriodicQueries();
      BLEManager.stopScanning();
    };
  }, []);

  // If navigated from Profile with openScanModal flag, show the Bluetooth popup
  useEffect(() => {
    if (route?.params?.openScanModal) {
      setShowScanningModal(true);
      BLEManager.clearAllDiscoveredDevices();
      setAllDiscoveredDevices([]);
      if (!BLEManager.isConnected) {
        BLEManager.startScanning();
      } else {
        BLEManager.queryPowerBankStatus();
      }
      // Reset the flag so it doesn't trigger again unintentionally
      navigation.setParams({openScanModal: false});
    }
  }, [route?.params?.openScanModal]);

  // Reload temperature unit when screen is focused (iOS: NotificationCenter for temperatureDidChange)
  useEffect(() => {
    if (isFocused) {
      loadUserData();
    }
  }, [isFocused]);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('loggedInUser');
      if (userData) {
        const user = JSON.parse(userData);
        setUserName(user.full_name || user.first_name || 'User');
        if (user.tempreture) setTemperatureUnit(user.tempreture);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const setupBLEManager = () => {
    // Set phone battery getter
    BLEManager.setPhoneBatteryGetter(getPhoneBatteryLevel);
    
    // Set delegate
    BLEManager.setDelegate({
      onBluetoothStateChange: (state) => {
        console.log('📶 Bluetooth state changed to:', state);
        if (state === 'PoweredOff') {
          // Hide devices popup and notify user
          setShowScanningModal(false);
          setIsConnected(false);
          // Clear data when Bluetooth is off
          setCaseBatteryLevel(0);
          setCaseTemperature(0);
          setIsCharging(false);
          setPhoneCharging(false);
          setUsbCharging(false);
          // Stop periodic queries
          BLEManager.stopPeriodicQueries();
          Alert.alert(
            'Bluetooth Off',
            'Please enable Bluetooth to connect to your device'
          );
        } else if (state === 'PoweredOn') {
          // iOS: bluetoothDidUpdateState - if poweredOn, start scanning (line 592-595)
          // As soon as Bluetooth turns ON, restart scanning if not connected
          if (!BLEManager.isConnected) {
            console.log('🔄 Bluetooth turned on, restarting scan...');
            setShowScanningModal(true);
            // Clear previous list so modal shows fresh devices
            BLEManager.clearAllDiscoveredDevices();
            setAllDiscoveredDevices([]);
            // Small delay to ensure Bluetooth is fully ready
            setTimeout(() => {
              if (!BLEManager.isConnected && BLEManager.startScanning) {
                BLEManager.startScanning();
              }
            }, 500);
          } else {
            console.log('✅ Bluetooth turned on, already connected');
          }
        }
      },
      
      onStartScanning: () => {
        console.log('🔍 Scanning started');
        // Clear previous devices when starting new scan
        BLEManager.clearAllDiscoveredDevices();
        setAllDiscoveredDevices([]);
      },
      
      onStopScanning: () => {
        console.log('🛑 Scanning stopped');
      },
      
      onDeviceDiscovered: (device) => {
        console.log('✅ iPowerUp device discovered:', device.name);
        // iOS line 598-607: Auto-connect if isAutoScanEnabled == true
        // Auto-connect is handled in BLEManagerNative when isAutoScanEnabled is true
        // If auto-connect is disabled, just show in modal
      },
      
      onAnyDeviceDiscovered: (devices) => {
        // Update all discovered devices for scanning modal (real-time)
        console.log('📱 Total devices discovered:', devices.length, devices.map(d => d.name));
        setAllDiscoveredDevices([...devices]);
      },
      
      onConnected: (device) => {
        console.log('✅ Connected to:', device?.name || 'Unknown Device');
        
        console.log('✅ Connected to:', device?.name || 'Unknown Device');
        
        // iOS line 195-203: didConnect sets isConnected and discovers services
        // iOS line 262-263: didConnectPeripheral() immediately calls queryPowerBankStatus
        setIsConnected(true);
        // IMPORTANT: Reset USB and charging states when connecting - button should be disabled
        // until we receive actual PowerBankStatus showing USB is connected
        setUsbCharging(false);
        setPhoneCharging(false);
        setIsCharging(false);
        // Close scanning modal when connected (iOS: modal closes on connect)
        setShowScanningModal(false);
        // iOS: Start periodic queries immediately
        BLEManager.startPeriodicQueries();
        
        // IMPORTANT: Wait longer for Android to complete service/characteristic discovery and notification setup
        // iOS: didConnectPeripheral() immediately queries (line 263) because iOS is faster
        // Android needs time for: service discovery → characteristic discovery → notification enable → descriptor write
        setTimeout(() => {
          if (BLEManager.isConnected) {
            console.log('🔍 Sending queryPowerBankStatus');
            BLEManager.queryPowerBankStatus();
          }
        }, 2000); // Increased to 2 seconds to ensure notification setup is complete
      },
      
      onConnectionFailed: (error) => {
        console.error('❌ Connection failed:', error);
        setIsConnected(false);
        // Retry scanning after 3 seconds
        setTimeout(() => {
          if (!BLEManager.isConnected) {
            BLEManager.startScanning();
          }
        }, 3000);
      },
      
      onDisconnected: (disconnectInfo) => {
        const reason = disconnectInfo?.reason || 'Unknown reason';
        const status = disconnectInfo?.status || -1;
        
        console.log('🔌 Disconnected - Reason:', reason, 'Status:', status);
        setIsConnected(false);
        setCaseBatteryLevel(0);
        setCaseTemperature(0);
        setIsCharging(false);
        setPhoneCharging(false);
        setUsbCharging(false);
        
        // Log disconnect reason for debugging
        console.log('📝 Disconnect Details:', {
          reason,
          status,
          timestamp: disconnectInfo?.timestamp,
          device: disconnectInfo?.device,
        });
        
        // Retry scanning after disconnect
        setTimeout(() => {
          if (!BLEManager.isConnected) {
            BLEManager.startScanning();
          }
        }, 2000);
      },
      
      onDataReceived: async (data) => {
        console.log('📥 HomeScreen: onDataReceived called with:', data);
        
        // iOS: After queryPowerBankStatus response, query charger config after 0.4 seconds (line 281-286)
        if (data && typeof data.caseBatPct === 'number') {
          setTimeout(() => {
            if (BLEManager.isConnected && BLEManager.queryChargerConfigStatus) {
              BLEManager.queryChargerConfigStatus();
            }
          }, 400); // 0.4 seconds like iOS
        }
        
        // Update UI with received data
        if (data && typeof data.caseBatPct === 'number') {
          setCaseBatteryLevel(data.caseBatPct);
        } else {
          console.warn('⚠️ Invalid caseBatPct:', data?.caseBatPct);
        }
        if (data && typeof data.caseTemp === 'number' && !isNaN(data.caseTemp)) {
          setCaseTemperature(Math.round(data.caseTemp));
        } else {
          console.warn('⚠️ Invalid caseTemp:', data?.caseTemp);
        }
        // Update charging states from PowerBankStatus (actual status, not config)
        const phoneChargingStatus = data?.phoneCharging === true;
        const usbChargingStatus = data?.usbCharging === true;
        console.log('🔌 USB Charging Status:', usbChargingStatus, '| Phone Charging Status:', phoneChargingStatus);
        setPhoneCharging(phoneChargingStatus);
        setUsbCharging(usbChargingStatus);
        setIsCharging(phoneChargingStatus);
        
        // Log button state for debugging
        console.log('🔘 Button will be:', (usbChargingStatus ? 'ENABLED' : 'DISABLED'), '- USB connected:', usbChargingStatus);
        
        // Get phone battery from phone (not from case)
        const phoneBattery = await getPhoneBatteryLevel();
        
        // Save to history (AsyncStorage)
        await saveHistoryEntry({
          phoneBattery: phoneBattery,
          caseBattery: data.caseBatPct,
          temperature: data.caseTemp,
          phoneCharging: data.phoneCharging,
          solarCurrent: data.solarCurr,
        });
      },
      
      getTemperatureUnit: () => temperatureUnit,
      
      onScanError: (error) => {
        console.error('Scan error in Home:', error);
        Alert.alert('Scan Error', error.message || 'Could not scan for devices.');
      },
      
      onPermissionError: (error) => {
        console.error('Permission error:', error);
        Alert.alert(
          'Bluetooth Permission Required',
          'Please grant Bluetooth permissions in Settings to connect to your iPowerUp device.',
          [
            {text: 'OK', style: 'default'},
          ]
        );
      },
      
      // Charger config received - enable/disable button based on enPhCharger
      onChargerConfigReceived: (config) => {
        console.log('📊 Charger Config received:', config);
        // iOS: Enable button if enPhCharger == true
        setChargeConfigEnabled(config.enPhCharger === true);
      },
    });
    
    // iOS line 592-595: bluetoothDidUpdateState - if poweredOn, start scanning
    // iOS line 598-607: didDiscoverPeripheral - auto-connect if isAutoScanEnabled == true
    // Start scanning immediately (iOS behavior - auto-connect enabled by default)
    if (!BLEManager.isConnected) {
      // Enable auto-connect for HomeScreen (iOS default behavior)
      BLEManager.isAutoScanEnabled = true;
      BLEManager.startScanning();
    } else {
      // Already connected - just query status
      BLEManager.queryPowerBankStatus();
    }
  };

  const formatTemperature = (tempCelsius) => {
    // Convert to Fahrenheit if needed (iOS line 319-328)
    let displayTemp = tempCelsius;
    if (temperatureUnit === 'fahrenheit') {
      if (tempCelsius === 0) {
        displayTemp = 0;
      } else {
        displayTemp = (tempCelsius * 9.0 / 5.0) + 32.0;
      }
    }
    const unit = temperatureUnit === 'fahrenheit' ? 'F' : 'C';
    return `${Math.round(displayTemp)}° ${unit}`;
  };

  const handleTransferPower = () => {
    if (!isConnected) {
      Alert.alert('Not Connected', 'Please connect to your device first');
      return;
    }
    
    // iOS logic (line 158-164, 308-312): Toggle based on ACTUAL phoneCharging status
    // iOS: If phoneCharging == true, send stop command (0x18)
    // iOS: If phoneCharging == false, send enable command (0x21)
    // Use actual charging status, not config setting
    if (phoneCharging) {
      // Phone is actually charging - send stop command (0x18)
      console.log('🛑 Stopping phone charging (0x18)...');
      BLEManager.stopCharging();
    } else {
      // Phone is not charging - send enable command (0x21)
      console.log('⚡ Enabling phone charging (0x21)...');
      BLEManager.enablePhoneCharging();
    }
    
    // After 2.5 seconds, query power bank status to update button state (iOS line 271-273, 276-278)
    // Also query charger config to keep it in sync
    setTimeout(() => {
      if (BLEManager.isConnected) {
        BLEManager.queryPowerBankStatus();
        if (BLEManager.queryChargerConfigStatus) {
          BLEManager.queryChargerConfigStatus();
        }
      }
    }, 2500);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Scanning Modal - Shows devices being discovered after permission granted */}
      <PermissionModal
        visible={showScanningModal}
        onAllow={() => {}} // No action needed
        onDontAllow={() => setShowScanningModal(false)}
        permissionType="bluetooth"
        discoveredDevices={allDiscoveredDevices}
        deviceCount={allDiscoveredDevices.length}
        hasPermissionGranted={true}
        showStaticDevices={false}
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
            <Text style={styles.greetingText}>
              Greetings, <Text style={styles.greetingName}>{userName}</Text>.
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
              <Image
                source={require('../../assets/home/bell-icon.png')}
                style={styles.bellIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>

          {/* Your Phone Section */}
          <Text style={styles.sectionTitle}>Your Phone</Text>
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>Phone Battery</Text>
                <Text style={styles.cardValue}>{phoneBatteryLevel}%</Text>
                <Text style={styles.cardSubtitle}>Battery Level</Text>
              </View>
              <Image
                source={getBatteryImage(phoneBatteryLevel)}
                style={styles.batteryImage}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Your Case Section */}
          <Text style={styles.sectionTitle}>Your Case</Text>
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>Case Battery</Text>
                <Text style={styles.cardValue}>
                  {caseBatteryLevel !== undefined && caseBatteryLevel !== null ? `${caseBatteryLevel}%` : '--%'}
                </Text>
                <Text style={styles.cardSubtitle}>Battery Level</Text>
              </View>
              <Image
                source={getBatteryImage(caseBatteryLevel)}
                style={styles.batteryImage}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Temperature Card */}
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>Case Temperature</Text>
                <Text style={styles.cardValue}>
                  {!isNaN(caseTemperature) && caseTemperature !== undefined && caseTemperature !== null 
                    ? formatTemperature(caseTemperature) 
                    : '--° C'}
                </Text>
                <Text style={styles.cardSubtitleRed}>Temperature Level</Text>
              </View>
              <Image
                source={getTemperatureImage(caseTemperature, temperatureUnit)}
                style={styles.temperatureImage}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Transfer Power Button */}
          {/* iOS behavior: Button image based on phoneCharging status (line 308-312) */}
          {/* 
            Button Logic:
            - Button is ENABLED only when: BLE connected AND USB actually connected (usbCharging == true)
            - Button is DISABLED when: BLE not connected OR USB not connected
            - Button shows YELLOW (Stop Charging) when phoneCharging == true
            - Button shows WHITE (Start Charging) when phoneCharging == false
            - Case connected != USB connected - button only works when real USB cable is connected
          */}
          <TouchableOpacity 
            style={styles.sliderButton}
            onPress={handleTransferPower}
            activeOpacity={0.9}
            disabled={!isConnected || !usbCharging}
          >
            <Image
              source={phoneCharging 
                ? require('../../assets/home/newYellowSlider.png')
                : require('../../assets/home/newWhiteSlider.png')
              }
              style={[styles.sliderImage, (!isConnected || !usbCharging) && {opacity: 0.4}]}
              resizeMode="contain"
            />
          </TouchableOpacity>


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
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 50 : 10,
    paddingBottom: 10,
  },
  greetingText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1D2733',
  },
  greetingName: {
    color: '#0097D9',
  },
  bellIcon: {
    width: 33,
    height: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1D2733',
    paddingHorizontal: 20,
    marginTop: 15,
    marginBottom: 10,
  },
  card: {
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#555555',
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 36,
    fontWeight: '600',
    color: '#1D2733',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#888888',
  },
  cardSubtitleRed: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FF3B30',
  },
  batteryImage: {
    width: 100,
    height: 65,
  },
  temperatureImage: {
    width: 60,
    height: 100,
  },
  sliderButton: {
    marginHorizontal: 20,
    marginTop: 15,
    height: 55,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderImage: {
    width: '100%',
    height: 55,
  },
});

export default HomeScreen;
