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

const getTemperatureImage = (temp, unit = 'celsius') => {
  let celsius = temp;
  if (unit === 'fahrenheit') celsius = (temp - 32) * 5 / 9;
  if (celsius <= 0) return require('../../assets/temperature/temp-blue.png');
  if (celsius <= 15) return require('../../assets/temperature/temp-green.png');
  if (celsius <= 25) return require('../../assets/temperature/temp-yellow.png');
  if (celsius <= 35) return require('../../assets/temperature/temp-orange.png');
  return require('../../assets/temperature/temp-red.png');
};

const HomeScreen = ({navigation, route}) => {
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
  const [commandHistory, setCommandHistory] = useState([]); // Debug: Track commands sent/received
  const [showDebugPanel, setShowDebugPanel] = useState(false); // Debug panel visibility
  const batteryIntervalRef = useRef(null);

  // Add command to history for debugging
  const addCommandToHistory = (type, command, hex, description) => {
    const entry = {
      timestamp: new Date(),
      type, // 'sent' or 'received'
      command,
      hex,
      description,
    };
    setCommandHistory(prev => [entry, ...prev].slice(0, 50)); // Keep last 50 entries
    console.log(`📊 [${type.toUpperCase()}] ${command} (${hex}): ${description}`);
  };

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
        
        // Clear and log connection
        addCommandToHistory('connected', 'DEVICE_CONNECTED', '--', `Connected to ${device?.name || 'Unknown Device'}`);
        addCommandToHistory('info', 'PASSWORD_WILL_BE_SENT', '0x19', 'Native module will send password after 1 second (iOS protocol)');
        addCommandToHistory('info', 'SERVICE_DISCOVERY', '--', 'Discovering services and characteristics...');
        
        // iOS line 195-203: didConnect sets isConnected and discovers services
        // iOS line 262-263: didConnectPeripheral() immediately calls queryPowerBankStatus
        setIsConnected(true);
        // Close scanning modal when connected (iOS: modal closes on connect)
        setShowScanningModal(false);
        // iOS: Start periodic queries immediately
        BLEManager.startPeriodicQueries();
        
        // IMPORTANT: Wait longer for Android to complete service/characteristic discovery and notification setup
        // iOS: didConnectPeripheral() immediately queries (line 263) because iOS is faster
        // Android needs time for: service discovery → characteristic discovery → notification enable → descriptor write
        setTimeout(() => {
          if (BLEManager.isConnected) {
            addCommandToHistory('sent', 'QUERY_POWER_BANK_STATUS', '0x04', 'Requesting device status (battery, temp, charging state)');
            console.log('🔍 Sending queryPowerBankStatus - check logs for response');
            BLEManager.queryPowerBankStatus();
            
            // Add timeout check - if no response in 5 seconds, log warning
            setTimeout(() => {
              if (BLEManager.isConnected) {
                // Check if we received data by checking if caseBatteryLevel is still 0
                console.warn('⚠️ No response received after 5 seconds - check Android logs for onCharacteristicChanged');
                addCommandToHistory('warning', 'NO_RESPONSE_TIMEOUT', '--', 'No response received after 5 seconds - check device connection');
              }
            }, 5000);
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
        
        // Determine command type from data
        let commandType = 'UNKNOWN';
        if (data && typeof data.caseBatPct === 'number') {
          commandType = 'POWER_BANK_STATUS_RESPONSE (0x04)';
          const dataStr = `Case: ${data.caseBatPct}%, Temp: ${data.caseTemp}°C, Charging: ${data.phoneCharging ? 'Yes' : 'No'}, Solar: ${data.solarCurr}mA`;
          addCommandToHistory('received', 'POWER_BANK_STATUS_RESPONSE', '0x04', dataStr);
          
          // iOS: After queryPowerBankStatus response, query charger config after 0.4 seconds (line 281-286)
          // iOS: DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { self.manager.sendCommand(.queryChargerConfigStatus) }
          setTimeout(() => {
            if (BLEManager.isConnected && BLEManager.queryChargerConfigStatus) {
              addCommandToHistory('sent', 'QUERY_CHARGER_CONFIG_STATUS', '0x03', 'Querying charger config...');
              BLEManager.queryChargerConfigStatus();
            }
          }, 400); // 0.4 seconds like iOS
        } else if (data) {
          commandType = 'OTHER_RESPONSE';
          addCommandToHistory('received', 'OTHER_RESPONSE', '?', JSON.stringify(data).substring(0, 50));
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
        setIsCharging(data?.phoneCharging || false);
        
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
        addCommandToHistory('error', 'PERMISSION_ERROR', '--', `Bluetooth permission required: ${error}`);
        Alert.alert(
          'Bluetooth Permission Required',
          'Please grant Bluetooth permissions in Settings to connect to your iPowerUp device.',
          [
            {text: 'OK', style: 'default'},
          ]
        );
      },
      
      // Debug callbacks for UI logging
      onRawDataReceived: (rawData) => {
        console.log('📥 Raw data received in UI from device:', rawData);
        if (rawData && typeof rawData === 'string' && rawData.length > 0) {
          const byteCount = Math.floor(rawData.length / 2);
          // Format hex with spaces for readability (every 2 chars = 1 byte)
          const formattedHex = rawData.match(/.{1,2}/g)?.join(' ').substring(0, 80) || rawData.substring(0, 80);
          addCommandToHistory('received_raw', 'DEVICE_SENT_RAW', '--', 
            `Device sent ${byteCount} bytes: ${formattedHex}${rawData.length > 80 ? '...' : ''}`);
        }
      },
      
      onDeviceResponse: (commandHex, rawHex, byteLength) => {
        console.log('📥 Device response detected:', commandHex, 'Bytes:', byteLength);
        // Format hex for display
        const formattedHex = rawHex.match(/.{1,2}/g)?.slice(0, 10).join(' ') || rawHex.substring(0, 20);
        addCommandToHistory('received', `DEVICE_RESPONSE_${commandHex}`, commandHex, 
          `Device responded with ${commandHex} (${byteLength} bytes): ${formattedHex}${rawHex.length > 20 ? '...' : ''}`);
      },
      
      onDataParseError: (error) => {
        console.error('❌ Data parse error:', error);
        addCommandToHistory('error', 'PARSE_ERROR', '--', error);
      },
      
      onNotificationEnabled: (success) => {
        if (success) {
          addCommandToHistory('info', 'NOTIFICATIONS_ENABLED', '--', 
            '✅ Notifications enabled - device can send responses');
        } else {
          addCommandToHistory('error', 'NOTIFICATIONS_FAILED', '--', 
            '❌ Failed to enable notifications - responses may not be received');
        }
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

  const formatTemperature = (temp) => {
    const unit = temperatureUnit === 'fahrenheit' ? 'F' : 'C';
    return `${Math.round(temp)}° ${unit}`;
  };

  const handleTransferPower = () => {
    if (!isConnected) {
      Alert.alert('Not Connected', 'Please connect to your device first');
      return;
    }
    
    // IMPORTANT: Transfer Power requires USB connection between phone and case
    // The BLE command only enables/disables charging - actual power transfer is via USB
    if (isCharging) {
      // Currently charging - stop it
      console.log('🛑 Stopping phone charging...');
      addCommandToHistory('sent', 'STOP_CHARGING', '0x18', 'Stopping phone charging');
      BLEManager.stopCharging();
      Alert.alert('Charging Stopped', 'Phone charging has been disabled. Disconnect USB cable to stop power transfer.');
    } else {
      // Not charging - enable it
      console.log('⚡ Enabling phone charging...');
      Alert.alert(
        'Enable Charging',
        'Make sure your phone is connected to the case via USB cable. The case will now start charging your phone.',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Enable',
            onPress: () => {
              addCommandToHistory('sent', 'ENABLE_PHONE_CHARGING', '0x21', 'Enabling phone charging (requires USB connection)');
              BLEManager.enablePhoneCharging();
            }
          }
        ]
      );
    }
    
    // Note: Actual charging status case se response mein aayega (phoneCharging flag)
    // UI update onDataReceived callback mein hoga
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
          {/* Connection Status Indicator - Shows REAL connection status */}
          {(() => {
            const connectionStatus = BLEManager.getConnectionStatus ? BLEManager.getConnectionStatus() : null;
            const reallyConnected = connectionStatus?.isReallyConnected || false;
            const hasData = caseBatteryLevel > 0 || (caseTemperature > 0 && !isNaN(caseTemperature));
            
            if (reallyConnected && hasData) {
              // Green: Really connected AND receiving data
              return (
                <View style={{padding: 8, backgroundColor: '#4CAF50', borderRadius: 8, marginBottom: 8}}>
                  <Text style={{color: 'white', textAlign: 'center', fontSize: 12}}>
                    ✅ Connected & Receiving Data
                  </Text>
                </View>
              );
            } else if (isConnected && !reallyConnected) {
              // Orange: BLE connected but no data received yet
              return (
                <View style={{padding: 8, backgroundColor: '#FF9800', borderRadius: 8, marginBottom: 8}}>
                  <Text style={{color: 'white', textAlign: 'center', fontSize: 12}}>
                    ⚠️ Connected but Waiting for Data...
                  </Text>
                </View>
              );
            } else {
              // Red: Not connected
              return (
                <View style={{padding: 8, backgroundColor: '#F44336', borderRadius: 8, marginBottom: 8}}>
                  <Text style={{color: 'white', textAlign: 'center', fontSize: 12}}>❌ Not Connected</Text>
                </View>
              );
            }
          })()}
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
          <TouchableOpacity 
            style={styles.sliderButton}
            onPress={handleTransferPower}
            activeOpacity={0.9}
          >
            <Image
              source={isCharging 
                ? require('../../assets/home/newYellowSlider.png')
                : require('../../assets/home/newWhiteSlider.png')
              }
              style={styles.sliderImage}
              resizeMode="contain"
            />
          </TouchableOpacity>

          {/* Debug Panel - Command History */}
          {isConnected && (
            <View style={styles.debugSection}>
              <TouchableOpacity
                onPress={() => setShowDebugPanel(!showDebugPanel)}
                style={styles.debugToggle}
              >
                <Text style={styles.debugToggleText}>
                  {showDebugPanel ? '▼' : '▶'} Command Flow Debug ({commandHistory.length} entries)
                </Text>
              </TouchableOpacity>
              
              {showDebugPanel && (
                <ScrollView 
                  style={styles.debugScrollView}
                  contentContainerStyle={styles.debugContent}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                >
                  <View style={styles.debugInfoBox}>
                    <Text style={styles.debugTitle}>📡 Expected Flow:</Text>
                    <Text style={styles.debugValue}>Connect → Password (0x19) → Query Power Bank (0x04) → Query Charger Config (0x03)</Text>
                  </View>

                  {commandHistory.length === 0 ? (
                    <Text style={styles.debugValue}>No commands yet. Connect to device to see command flow.</Text>
                  ) : (
                    commandHistory.map((entry, index) => {
                      const time = new Date(entry.timestamp);
                      const formattedTime = time.toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false,
                      });
                      
                      // Different colors for different log types
                      let bgColor = '#FFF3E0';
                      let textColor = '#F57C00';
                      if (entry.type === 'sent') {
                        bgColor = '#E3F2FD';
                        textColor = '#1976D2';
                      } else if (entry.type === 'received' || entry.type === 'received_raw') {
                        bgColor = '#E8F5E9';
                        textColor = '#388E3C';
                      } else if (entry.type === 'error') {
                        bgColor = '#FFEBEE';
                        textColor = '#C62828';
                      } else if (entry.type === 'connected' || entry.type === 'info') {
                        bgColor = '#FFF3E0';
                        textColor = '#F57C00';
                      }
                      
                      return (
                        <View key={index} style={[styles.debugLogEntry, {backgroundColor: bgColor}]}>
                          <View style={styles.debugLogHeader}>
                            <Text style={[styles.debugLogTime, {color: textColor}]}>
                              {formattedTime}
                            </Text>
                            <Text style={[styles.debugLogType, {color: textColor}]}>
                              {entry.type.toUpperCase()}
                            </Text>
                          </View>
                          <Text style={[styles.debugLogCommand, {color: textColor}]}>
                            {entry.command} ({entry.hex})
                          </Text>
                          <Text style={styles.debugLogDescription}>
                            {entry.description}
                          </Text>
                        </View>
                      );
                    })
                  )}
                </ScrollView>
              )}
            </View>
          )}

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
  debugSection: {
    marginHorizontal: 20,
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#F9F9F9',
  },
  debugInfoBox: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  debugToggle: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  debugToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0097D9',
  },
  debugScrollView: {
    maxHeight: 400,
  },
  debugContent: {
    padding: 12,
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1D2733',
    marginBottom: 6,
  },
  debugValue: {
    fontSize: 10,
    color: '#666666',
    fontFamily: 'monospace',
    marginBottom: 4,
    lineHeight: 16,
  },
  debugLogEntry: {
    marginBottom: 8,
    padding: 10,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#0097D9',
  },
  debugLogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  debugLogTime: {
    fontSize: 9,
    fontWeight: '600',
    flex: 1,
  },
  debugLogType: {
    fontSize: 9,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  debugLogCommand: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  debugLogDescription: {
    fontSize: 10,
    color: '#666666',
    fontFamily: 'monospace',
  },
});

export default HomeScreen;
