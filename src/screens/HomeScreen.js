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
import {useTranslation} from 'react-i18next';
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
  const {t, i18n} = useTranslation();
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
  const [showDebug, setShowDebug] = useState(true); // Show debug panel
  const [debugInfo, setDebugInfo] = useState({
    connectionStatus: 'Disconnected',
    lastDataTime: null,
    queryAttempts: 0,
    lastError: null,
    buttonState: 'Disabled',
    rawData: null,
    periodicQueryActive: false,
    gattState: 'Unknown',
    dataReceivedCount: 0,
    lastValidBattery: null,
    lastValidTemp: null,
    usbStatusHistory: [], // Track USB status changes
    notificationsEnabled: false, // Track notification status
    rawDataHex: null, // Raw hex data string
    lastDeviceResponse: null, // Last device response info
  });
  const dataReceivedCountRef = useRef(0);

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
        
        // If just connected, ensure periodic query is active
        if (currentConnected && !debugInfo.periodicQueryActive) {
          console.log('🔄 Connection detected but periodic query inactive - restarting...');
          if (BLEManager.startPeriodicQueries) {
            BLEManager.startPeriodicQueries();
          }
          setDebugInfo(prev => ({
            ...prev,
            periodicQueryActive: true,
          }));
        }
      }
      
      // CRITICAL: Check if connected but values are missing - auto-retry
      // This fixes intermittent issue where values don't show
      if (currentConnected && (caseBatteryLevel === 0 || caseTemperature === 0)) {
        const hasNoBattery = (caseBatteryLevel === 0 || caseBatteryLevel === null || caseBatteryLevel === undefined);
        const hasNoTemp = (caseTemperature === 0 || caseTemperature === null || caseTemperature === undefined || isNaN(caseTemperature));
        
        // Only retry if both are missing (not just low values) AND no data received yet
        if (hasNoBattery && hasNoTemp && debugInfo.dataReceivedCount === 0) {
          console.log('⚠️ Periodic check: Values missing and no data received, retrying query...');
          if (BLEManager.isConnected && BLEManager.queryPowerBankStatus) {
            BLEManager.queryPowerBankStatus().catch((error) => {
              console.error('❌ Periodic retry failed:', error);
            });
          }
        }
      }
      
      // CRITICAL: Verify periodic query is still active
      if (currentConnected) {
        const queryActive = BLEManager.queryInterval != null;
        if (!queryActive && debugInfo.periodicQueryActive) {
          console.error('❌ Periodic query stopped! Restarting...');
          if (BLEManager.startPeriodicQueries) {
            BLEManager.startPeriodicQueries();
          }
          setDebugInfo(prev => ({
            ...prev,
            periodicQueryActive: true,
            lastError: 'Periodic query stopped - restarted',
          }));
        }
      }
    }, 5000); // Check every 5 seconds
    
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
  // Also check if connected but no data received - retry query
  useEffect(() => {
    if (isFocused) {
      loadUserData();
      
      // If connected but no data showing, retry query (handles intermittent issues)
      // CRITICAL: Check if values are actually missing (0 or null) vs just low values
      const hasNoBattery = (caseBatteryLevel === 0 || caseBatteryLevel === null || caseBatteryLevel === undefined);
      const hasNoTemp = (caseTemperature === 0 || caseTemperature === null || caseTemperature === undefined || isNaN(caseTemperature));
      const hasNoData = debugInfo.dataReceivedCount === 0;
      
      if (isConnected && (hasNoBattery || hasNoTemp || hasNoData)) {
        console.log('⚠️ Screen focused: Connected but no data, retrying query...');
        console.log('📊 Current values - Battery:', caseBatteryLevel, 'Temp:', caseTemperature, 'Data Count:', debugInfo.dataReceivedCount);
        
        // Update debug
        setDebugInfo(prev => ({
          ...prev,
          lastError: hasNoData ? 'No data received - possible notification issue' : 'Values missing on screen focus - retrying',
        }));
        
        // CRITICAL: If no data received at all, it's likely notifications not enabled
        // Try to re-enable notifications and send query
        if (hasNoData) {
          console.log('⚠️ No data received at all - checking notifications...');
          // Force query immediately
          if (BLEManager.isConnected && BLEManager.queryPowerBankStatus) {
            console.log('🔄 Force sending query (no data received yet)...');
            BLEManager.queryPowerBankStatus().catch((error) => {
              console.error('❌ Force query failed:', error);
            });
          }
        }
        
        // Retry with multiple attempts
        const retryQuery = (attempt = 1) => {
          setTimeout(() => {
            if (BLEManager.isConnected && BLEManager.queryPowerBankStatus) {
              console.log(`🔄 Retry query attempt ${attempt}...`);
              BLEManager.queryPowerBankStatus().catch((error) => {
                console.error('❌ Retry query failed:', error);
                if (attempt < 5) {
                  retryQuery(attempt + 1);
                }
              });
            }
          }, attempt * 1000); // 1s, 2s, 3s, 4s, 5s
        };
        
        retryQuery(1);
      }
    }
  }, [isFocused, isConnected, caseBatteryLevel, caseTemperature]);

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
        
        // iOS line 195-203: didConnect sets isConnected and discovers services
        // iOS line 262-263: didConnectPeripheral() immediately calls queryPowerBankStatus
        setIsConnected(true);
        // Reset charging states when connecting
        setUsbCharging(false);
        setPhoneCharging(false);
        setIsCharging(false);
        // Enable button by default when connected (will be updated when charger config is received)
        // iOS: Button is enabled when enPhCharger == true, but we enable it initially
        // and update based on actual config response
        setChargeConfigEnabled(true); // Default to enabled, will be updated by config
        // Close scanning modal when connected (iOS: modal closes on connect)
        setShowScanningModal(false);
        // iOS: Start periodic queries immediately
        // CRITICAL: Stop any existing periodic query first, then start fresh
        // This ensures periodic query is active on reconnect
        if (BLEManager.stopPeriodicQueries) {
          BLEManager.stopPeriodicQueries();
        }
        BLEManager.startPeriodicQueries();
        
        // Verify periodic query is actually active
        setTimeout(() => {
          const isActive = BLEManager.queryInterval != null;
          console.log('📊 Periodic query active:', isActive);
          setDebugInfo(prev => ({
            ...prev,
            periodicQueryActive: isActive,
          }));
        }, 1000);
        
        // Update debug info
        setDebugInfo(prev => ({
          ...prev,
          connectionStatus: 'Connected',
          lastError: null,
          periodicQueryActive: true,
          queryAttempts: 0, // Reset on reconnect
          dataReceivedCount: 0, // Reset on reconnect
        }));
        
        // Reset data received count on reconnect
        dataReceivedCountRef.current = 0;
        
        // iOS: didConnectPeripheral() immediately calls queryPowerBankStatus (line 64)
        // iOS: After 2 seconds, if connected, sends query (line 60-66)
        // iOS: Periodic query runs every interval (line 75-95)
        // CRITICAL: iOS ensures values always show by:
        // 1. Immediate query after connection (2 seconds delay)
        // 2. Periodic query every interval
        // 3. Direct update from PowerBankStatus (no verification delays)
        
        // iOS pattern: Query immediately after connection (with small delay for Android)
        // Then periodic query handles continuous updates
        // CRITICAL: Multiple retry attempts to ensure data is received
        const sendInitialQuery = (attempt = 1, maxAttempts = 5) => {
          const delays = [2000, 3000, 4000, 5000, 6000]; // Increasing delays
          const delay = delays[attempt - 1] || 6000;
          
          setTimeout(() => {
            if (BLEManager.isConnected) {
              console.log(`🔍 iOS pattern: Sending initial queryPowerBankStatus (attempt ${attempt}/${maxAttempts})...`);
              
              // Update query attempts in debug
              setDebugInfo(prev => ({
                ...prev,
                queryAttempts: attempt,
              }));
              
              BLEManager.queryPowerBankStatus().catch((error) => {
                console.error(`❌ Initial query attempt ${attempt} failed:`, error);
                setDebugInfo(prev => ({
                  ...prev,
                  lastError: `Query attempt ${attempt} failed: ${error.message || error}`,
                }));
                
                // Retry if not last attempt
                if (attempt < maxAttempts) {
                  console.log(`🔄 Retrying query in ${delays[attempt] / 1000} seconds...`);
                  sendInitialQuery(attempt + 1, maxAttempts);
                } else {
                  console.error('❌ All query attempts failed - no data received');
                  setDebugInfo(prev => ({
                    ...prev,
                    lastError: 'All query attempts failed - check device connection',
                  }));
                }
              });
              
              // iOS: Query charger config after 1.4 seconds (line 348)
              // Only query config if we're on a later attempt (give time for first query)
              if (attempt >= 2) {
                setTimeout(() => {
                  if (BLEManager.isConnected && BLEManager.queryChargerConfigStatus) {
                    console.log('📊 Querying charger config status...');
                    BLEManager.queryChargerConfigStatus();
                  }
                }, 1400);
              }
            } else {
              console.warn('⚠️ Not connected, skipping query attempt', attempt);
            }
          }, delay);
        };
        
        // Start initial query with multiple retries (iOS pattern + Android reliability)
        sendInitialQuery(1, 5);
        
        // CRITICAL: Check if data received after 10 seconds
        // If no data received, it's likely a case issue
        setTimeout(() => {
          if (BLEManager.isConnected && debugInfo.dataReceivedCount === 0) {
            console.error('❌ No data received after 10 seconds - possible case issue');
            setDebugInfo(prev => ({
              ...prev,
              lastError: 'No data received after 10s - check case connection',
            }));
            
            // Force one more query
            if (BLEManager.queryPowerBankStatus) {
              console.log('🔄 Force sending query after 10s timeout...');
              BLEManager.queryPowerBankStatus();
            }
          }
        }, 10000);
        
        // CRITICAL: Verify periodic query is actually running
        // Check after 3 seconds to ensure it's active
        setTimeout(() => {
          const queryActive = BLEManager.queryInterval != null;
          console.log('🔍 Verifying periodic query after 3 seconds:', queryActive ? 'Active' : 'Inactive');
          
          if (!queryActive && BLEManager.isConnected) {
            console.error('❌ Periodic query not active! Restarting...');
            setDebugInfo(prev => ({
              ...prev,
              lastError: 'Periodic query inactive - restarting',
            }));
            // Restart periodic query
            if (BLEManager.startPeriodicQueries) {
              BLEManager.startPeriodicQueries();
            }
          }
          
          setDebugInfo(prev => ({
            ...prev,
            periodicQueryActive: queryActive,
          }));
        }, 3000);
      },
      
      onConnectionFailed: (error) => {
        console.error('❌ Connection failed:', error);
        setIsConnected(false);
        
        // Update debug info
        setDebugInfo(prev => ({
          ...prev,
          connectionStatus: 'Connection Failed',
          lastError: `Connection failed: ${error?.message || error}`,
        }));
        
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
        
        // CRITICAL: Don't reset values to 0 on disconnect - keep last known values
        // This helps identify if it's a connection issue vs data issue
        // Only reset if explicitly disconnected by user
        if (reason !== 'User disconnect') {
          // Keep last values for debugging
          console.log('📌 Keeping last known values for debugging:', {
            battery: caseBatteryLevel,
            temp: caseTemperature,
          });
        } else {
          // User explicitly disconnected - reset values
          setCaseBatteryLevel(0);
          setCaseTemperature(0);
        }
        
        setIsCharging(false);
        setPhoneCharging(false);
        setUsbCharging(false);
        
        // CRITICAL: Stop periodic query on disconnect
        if (BLEManager.stopPeriodicQueries) {
          BLEManager.stopPeriodicQueries();
        }
        
        // Update debug info
        setDebugInfo(prev => ({
          ...prev,
          connectionStatus: 'Disconnected',
          lastError: `Disconnected: ${reason}`,
          periodicQueryActive: false,
        }));
        
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
        
        // Increment data received count FIRST
        dataReceivedCountRef.current += 1;
        const currentCount = dataReceivedCountRef.current;
        
        console.log('📥 Data received! Count:', currentCount);
        console.log('📥 Full data object:', JSON.stringify(data, null, 2));
        
        // Update debug info with raw data
        setDebugInfo(prev => ({
          ...prev,
          lastDataTime: Date.now(),
          lastError: null,
          rawData: data,
          dataReceivedCount: currentCount,
        }));
        
        // iOS: After queryPowerBankStatus response, query charger config after 1.4 seconds (line 348-355)
        // iOS uses 1.4 seconds delay, not 0.4 seconds
        if (data && typeof data.caseBatPct === 'number') {
          setTimeout(() => {
            if (BLEManager.isConnected && BLEManager.queryChargerConfigStatus) {
              BLEManager.queryChargerConfigStatus();
            }
          }, 1400); // 1.4 seconds like iOS (line 348)
        }
        
        // Update UI with received data - ensure we have valid data before updating
        // CRITICAL: Always update if we have valid data, even if previous value was 0
        // This fixes intermittent issue where values don't show
        let batteryUpdated = false;
        let tempUpdated = false;
        
        if (data && typeof data.caseBatPct === 'number' && data.caseBatPct >= 0 && data.caseBatPct <= 100) {
          setCaseBatteryLevel(data.caseBatPct);
          batteryUpdated = true;
          console.log('✅ Updated case battery:', data.caseBatPct + '%');
          
          // Update debug with last valid battery
          setDebugInfo(prev => ({
            ...prev,
            lastValidBattery: data.caseBatPct,
          }));
        } else {
          console.warn('⚠️ Invalid caseBatPct:', data?.caseBatPct);
          // If we have previous valid value, keep it (don't reset to 0)
          if (caseBatteryLevel > 0 && caseBatteryLevel <= 100) {
            console.log('📌 Keeping previous valid battery value:', caseBatteryLevel + '%');
          }
        }
        
        if (data && typeof data.caseTemp === 'number' && !isNaN(data.caseTemp) && data.caseTemp >= -50 && data.caseTemp <= 150) {
          const roundedTemp = Math.round(data.caseTemp);
          setCaseTemperature(roundedTemp);
          tempUpdated = true;
          console.log('✅ Updated case temperature:', roundedTemp + '°C');
          
          // Update debug with last valid temp
          setDebugInfo(prev => ({
            ...prev,
            lastValidTemp: roundedTemp,
          }));
        } else {
          console.warn('⚠️ Invalid caseTemp:', data?.caseTemp);
          // If we have previous valid value, keep it (don't reset to 0)
          if (caseTemperature !== 0 && !isNaN(caseTemperature)) {
            console.log('📌 Keeping previous valid temp value:', caseTemperature + '°C');
          }
        }
        
        // Increment data received count
        dataReceivedCountRef.current += 1;
        // Update charging states from PowerBankStatus (actual status, not config)
        // iOS: Directly updates from PowerBankStatus response (line 300, 308-312)
        // iOS doesn't do any verification - it trusts the device response
        const phoneChargingStatus = data?.phoneCharging === true;
        const usbChargingStatus = data?.usbCharging === true;
        console.log('🔌 USB Charging Status:', usbChargingStatus, '| Phone Charging Status:', phoneChargingStatus);
        
        // iOS: Directly update from PowerBankStatus (line 300: swipeImageState based on phoneCharging)
        // iOS: No special handling for USB status - just update directly
        // CRITICAL: Only update charging status from PowerBankStatus (0x04), not from command responses (0x21, 0x18)
        if (data && typeof data.phoneCharging === 'boolean') {
          const previousCharging = phoneCharging;
          setPhoneCharging(phoneChargingStatus);
          setIsCharging(phoneChargingStatus);
          console.log('🔌 Phone Charging Status updated from PowerBankStatus:', phoneChargingStatus ? '✅ Charging' : '❌ Not Charging');
          console.log('🔌 Status changed:', previousCharging, '→', phoneChargingStatus);
          
          // Update debug info
          setDebugInfo(prev => ({
            ...prev,
            rawData: {
              ...prev.rawData,
              phoneCharging: phoneChargingStatus,
            },
          }));
        } else {
          console.warn('⚠️ Phone charging status not in data or invalid:', data?.phoneCharging);
        }
        
        // iOS: USB status is part of PowerBankStatus but not explicitly tracked separately
        // We track it for button enable/disable logic, but update directly like iOS
        // CRITICAL: Always update USB status from data, even if false
        // This ensures USB status is accurate
        if (data && typeof data.usbCharging === 'boolean') {
          const previousUsbStatus = usbCharging;
          setUsbCharging(usbChargingStatus);
          console.log('🔌 USB Status updated from device:', usbChargingStatus ? '✅ Connected' : '❌ Not Connected');
          console.log('🔌 USB Status changed:', previousUsbStatus, '→', usbChargingStatus);
          
          // Track USB status history for debugging
          setDebugInfo(prev => {
            const history = prev.usbStatusHistory || [];
            const newHistory = [
              {
                timestamp: Date.now(),
                status: usbChargingStatus,
                battery: data.caseBatPct,
                temp: data.caseTemp,
              },
              ...history,
            ].slice(0, 5); // Keep last 5 entries
            
            return {
              ...prev,
              rawData: {
                ...prev.rawData,
                usbCharging: usbChargingStatus,
                usbStatusFromDevice: usbChargingStatus,
                flags: data.flags || 'N/A',
              },
              usbStatusHistory: newHistory,
            };
          });
          
          // Debug: Log if USB should be connected but showing false
          if (!usbChargingStatus) {
            console.log('⚠️ USB showing as NOT connected in device response');
            console.log('📊 Full PowerBankStatus:', JSON.stringify(data, null, 2));
            console.log('📊 Flags byte analysis:');
            console.log('   - USB bit (0x02) should be set if USB connected');
            console.log('   - Check if USB cable is physically connected to case');
            console.log('   - USB status comes from PowerBankStatus byte 4, bit 1');
          } else {
            console.log('✅ USB confirmed connected by device');
          }
        } else {
          console.warn('⚠️ USB charging status not in data or invalid:', data?.usbCharging);
          console.warn('⚠️ Data object:', data);
          console.warn('⚠️ Data type:', typeof data?.usbCharging);
          console.warn('⚠️ Full data received:', JSON.stringify(data, null, 2));
          
          // Update debug with error
          setDebugInfo(prev => ({
            ...prev,
            lastError: `USB status invalid: ${data?.usbCharging} (type: ${typeof data?.usbCharging})`,
          }));
        }
        
        // Log button state for debugging
        console.log('🔘 Button state - USB:', usbChargingStatus, '| Phone Charging:', phoneChargingStatus, '| Config Enabled:', chargeConfigEnabled);
        
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
        setDebugInfo(prev => ({
          ...prev,
          lastError: `Scan error: ${error?.message || error}`,
        }));
        Alert.alert('Scan Error', error.message || 'Could not scan for devices.');
      },
      
      onPermissionError: (error) => {
        console.error('Permission error:', error);
        setDebugInfo(prev => ({
          ...prev,
          lastError: `Permission error: ${error?.message || error}`,
        }));
        Alert.alert(
          'Bluetooth Permission Required',
          'Please grant Bluetooth permissions in Settings to connect to your iPowerUp device.',
          [
            {text: 'OK', style: 'default'},
          ]
        );
      },
      
      // Charger config received - enable/disable button based on enPhCharger
      // iOS: Button is enabled when enPhCharger == true (regardless of USB connection)
      onChargerConfigReceived: (config) => {
        console.log('📊 Charger Config received:', config);
        // iOS: Enable button if enPhCharger == true
        const isEnabled = config.enPhCharger === true;
        setChargeConfigEnabled(isEnabled);
        console.log('🔘 Transfer Power Button enabled:', isEnabled, '(enPhCharger:', config.enPhCharger, ')');
        
        // Update debug info
        setDebugInfo(prev => ({
          ...prev,
          lastError: null,
        }));
      },
      
      // Notification enabled callback - CRITICAL for data reception
      onNotificationEnabled: (enabled) => {
        console.log('📡 Notifications enabled status:', enabled);
        setDebugInfo(prev => ({
          ...prev,
          notificationsEnabled: enabled,
          lastError: enabled ? null : '❌ Notifications failed - data will not be received!',
        }));
        
        if (!enabled) {
          console.error('❌ CRITICAL: Notifications not enabled - device cannot send data!');
          console.error('❌ This is why Data Received: 0 times');
          console.error('❌ Try: Disconnect and reconnect device');
        } else {
          console.log('✅ Notifications enabled - device can now send data');
          // Send query immediately after notifications enabled
          setTimeout(() => {
            if (BLEManager.isConnected && BLEManager.queryPowerBankStatus) {
              console.log('🔍 Sending query after notifications enabled...');
              BLEManager.queryPowerBankStatus();
            }
          }, 500);
        }
      },
      
      // Raw data received callback - for debugging hex data
      onRawDataReceived: (rawData) => {
        // Log raw hex data for debugging
        console.log('📥 Raw hex data received:', rawData);
        
        // Parse first byte to identify command
        let commandInfo = 'Unknown';
        if (rawData && rawData.length >= 2) {
          const firstByte = rawData.substring(0, 2);
          const commandMap = {
            '04': 'PowerBankStatus (0x04)',
            '03': 'ChargerConfig (0x03)',
            '21': 'EnableCharging ACK (0x21)',
            '18': 'StopCharging ACK (0x18)',
            '19': 'Password ACK (0x19)',
          };
          commandInfo = commandMap[firstByte] || `Unknown (0x${firstByte})`;
        }
        
        setDebugInfo(prev => ({
          ...prev,
          rawDataHex: rawData,
          lastRawDataCommand: commandInfo,
        }));
      },
      
      // Device response callback - for command acknowledgments
      onDeviceResponse: (commandHex, rawData, length) => {
        // Log device responses (command acknowledgments)
        console.log('📥 Device Response:', commandHex, '| Length:', length, 'bytes');
        setDebugInfo(prev => ({
          ...prev,
          lastDeviceResponse: `${commandHex} (${length} bytes)`,
        }));
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
      setDebugInfo(prev => ({
        ...prev,
        lastError: 'Button pressed but not connected',
      }));
      Alert.alert('Not Connected', 'Please connect to your device first');
      return;
    }
    
    if (!chargeConfigEnabled) {
      setDebugInfo(prev => ({
        ...prev,
        lastError: 'Button pressed but enPhCharger disabled',
      }));
      Alert.alert('Charging Disabled', 'Phone charging is disabled in device configuration');
      return;
    }
    
    // iOS logic (line 158-164, 308-312): Toggle based on ACTUAL phoneCharging status
    // iOS: If phoneCharging == true, send stop command (0x18)
    // iOS: If phoneCharging == false, send enable command (0x21)
    // Use actual charging status, not config setting
    if (phoneCharging) {
      // Phone is actually charging - send stop command (0x18)
      console.log('🛑 Stopping phone charging (0x18)...');
      setDebugInfo(prev => ({
        ...prev,
        lastError: null,
      }));
      BLEManager.stopCharging().catch((error) => {
        console.error('❌ Failed to stop charging:', error);
        setDebugInfo(prev => ({
          ...prev,
          lastError: `Stop charging failed: ${error?.message || error}`,
        }));
        Alert.alert('Error', 'Failed to stop charging. Please try again.');
      });
    } else {
      // Phone is not charging - send enable command (0x21)
      console.log('⚡ Enabling phone charging (0x21)...');
      setDebugInfo(prev => ({
        ...prev,
        lastError: null,
      }));
      BLEManager.enablePhoneCharging().catch((error) => {
        console.error('❌ Failed to enable charging:', error);
        setDebugInfo(prev => ({
          ...prev,
          lastError: `Enable charging failed: ${error?.message || error}`,
        }));
        Alert.alert('Error', 'Failed to enable charging. Please try again.');
      });
    }
    
    // iOS: No immediate query after command - periodic query (every 5 seconds) will update status
    // iOS line 287-294: Just debugPrint after command, no query
    // The periodic query (started in onConnected) will automatically update the status
    // However, we can send a query after a short delay to get faster feedback (optional)
    // iOS doesn't do this, but it helps with UX
    setTimeout(() => {
      if (BLEManager.isConnected && BLEManager.queryPowerBankStatus) {
        console.log('🔍 Querying PowerBankStatus after charging command to get updated status...');
        BLEManager.queryPowerBankStatus().catch((error) => {
          console.error('❌ Query after command failed:', error);
        });
      }
    }, 1500); // 1.5 seconds delay - gives device time to process command
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
              {t('home.greetings')}, <Text style={styles.greetingName}>{userName}</Text>.
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
          <Text style={styles.sectionTitle}>{t('home.yourPhone')}</Text>
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>{t('home.phoneBattery')}</Text>
                <Text style={styles.cardValue}>{phoneBatteryLevel}%</Text>
                <Text style={styles.cardSubtitle}>{t('home.batteryLevel')}</Text>
              </View>
              <Image
                source={getBatteryImage(phoneBatteryLevel)}
                style={styles.batteryImage}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Your Case Section */}
          <Text style={styles.sectionTitle}>{t('home.yourCase')}</Text>
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>{t('home.caseBattery')}</Text>
                <Text style={styles.cardValue}>
                  {caseBatteryLevel !== undefined && caseBatteryLevel !== null ? `${caseBatteryLevel}%` : '--%'}
                </Text>
                <Text style={styles.cardSubtitle}>{t('home.batteryLevel')}</Text>
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
                <Text style={styles.cardTitle}>{t('home.caseTemperature')}</Text>
                <Text style={styles.cardValue}>
                  {!isNaN(caseTemperature) && caseTemperature !== undefined && caseTemperature !== null 
                    ? formatTemperature(caseTemperature) 
                    : '--° C'}
                </Text>
                <Text style={styles.cardSubtitleRed}>{t('home.temperatureLevel')}</Text>
              </View>
              <Image
                source={getTemperatureImage(caseTemperature, temperatureUnit)}
                style={styles.temperatureImage}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Transfer Power Button */}
          {/* iOS behavior: Button enabled when device connected AND enPhCharger == true */}
          {/* 
            Button Logic (iOS reference):
            - Button is ENABLED when: BLE connected AND enPhCharger config == true
            - Button is DISABLED when: BLE not connected OR enPhCharger == false
            - Button shows YELLOW (Stop Charging) when phoneCharging == true
            - Button shows WHITE (Start Charging) when phoneCharging == false
            - USB connection status is informational only, doesn't control button enable/disable
          */}
          <TouchableOpacity 
            style={styles.sliderButton}
            onPress={handleTransferPower}
            activeOpacity={0.9}
            disabled={!isConnected || !chargeConfigEnabled}
          >
            <Image
              source={
                i18n.language === 'es'
                  ? phoneCharging
                    ? require('../../assets/home/Stop_Charging_spanish.png')
                    : require('../../assets/home/Transfer_spanish.png')
                  : phoneCharging
                    ? require('../../assets/home/newYellowSlider.png')
                    : require('../../assets/home/newWhiteSlider.png')
              }
              style={[styles.sliderImage, (!isConnected || !chargeConfigEnabled) && {opacity: 0.4}]}
              resizeMode="contain"
            />
          </TouchableOpacity>

          {/* Debug Panel */}
          <TouchableOpacity 
            style={styles.debugToggle}
            onPress={() => setShowDebug(!showDebug)}
            activeOpacity={0.7}
          >
            <Text style={styles.debugToggleText}>
              {showDebug ? '▼ Hide Debug' : '▲ Show Debug'}
            </Text>
          </TouchableOpacity>

          {showDebug && (
            <View style={styles.debugPanel}>
              <Text style={styles.debugTitle}>🔍 Debug Information</Text>
              
              {/* Connection Status */}
              <View style={styles.debugRow}>
                <Text style={styles.debugLabel}>Connection:</Text>
                <Text style={[styles.debugValue, isConnected ? styles.debugSuccess : styles.debugError]}>
                  {isConnected ? '✅ Connected' : '❌ Disconnected'}
                </Text>
              </View>

              {/* Button State */}
              <View style={styles.debugRow}>
                <Text style={styles.debugLabel}>Button State:</Text>
                <Text style={[styles.debugValue, (!isConnected || !chargeConfigEnabled) ? styles.debugError : styles.debugSuccess]}>
                  {!isConnected ? '❌ Not Connected' : !chargeConfigEnabled ? '❌ Config Disabled' : '✅ Enabled'}
                </Text>
              </View>

              {/* Charge Config */}
              <View style={styles.debugRow}>
                <Text style={styles.debugLabel}>enPhCharger Config:</Text>
                <Text style={[styles.debugValue, chargeConfigEnabled ? styles.debugSuccess : styles.debugError]}>
                  {chargeConfigEnabled ? '✅ Enabled' : '❌ Disabled'}
                </Text>
              </View>

              {/* USB Charging */}
              <View style={styles.debugRow}>
                <Text style={styles.debugLabel}>USB Connected:</Text>
                <Text style={[styles.debugValue, usbCharging ? styles.debugSuccess : styles.debugWarning]}>
                  {usbCharging ? '✅ Yes' : '⚠️ No'}
                </Text>
              </View>

              {/* USB Status from Last Data */}
              {debugInfo.rawData && typeof debugInfo.rawData.usbCharging === 'boolean' && (
                <View style={styles.debugRow}>
                  <Text style={styles.debugLabel}>USB (from device):</Text>
                  <Text style={[styles.debugValue, debugInfo.rawData.usbCharging ? styles.debugSuccess : styles.debugWarning]}>
                    {debugInfo.rawData.usbCharging ? '✅ Yes' : '⚠️ No'}
                  </Text>
                </View>
              )}

              {/* USB Status History */}
              {debugInfo.usbStatusHistory && debugInfo.usbStatusHistory.length > 0 && (
                <View style={styles.debugRow}>
                  <Text style={styles.debugLabel}>USB History:</Text>
                  <Text style={styles.debugValueSmall} numberOfLines={2}>
                    {debugInfo.usbStatusHistory.slice(0, 3).map((entry, idx) => 
                      `${entry.status ? '✅' : '❌'} ${new Date(entry.timestamp).toLocaleTimeString()}`
                    ).join(', ')}
                  </Text>
                </View>
              )}

              {/* USB Status Help */}
              <View style={styles.debugRow}>
                <Text style={styles.debugLabel}>USB Info:</Text>
                <Text style={[styles.debugValue, styles.debugValueSmall]} numberOfLines={3}>
                  {(() => {
                    if (debugInfo.rawData && typeof debugInfo.rawData.usbCharging === 'boolean') {
                      if (!debugInfo.rawData.usbCharging) {
                        return '⚠️ Device reports USB NOT connected. Check: 1) USB cable physically connected? 2) Cable working? 3) Case USB port working?';
                      }
                      return '✅ USB connected (from PowerBankStatus byte 4, bit 1)';
                    }
                    return '💡 USB status from PowerBankStatus (byte 4, bit 1 = 0x02)';
                  })()}
                </Text>
              </View>

              {/* Phone Charging */}
              <View style={styles.debugRow}>
                <Text style={styles.debugLabel}>Phone Charging:</Text>
                <Text style={[styles.debugValue, phoneCharging ? styles.debugSuccess : styles.debugWarning]}>
                  {phoneCharging ? '✅ Yes' : '⚠️ No'}
                </Text>
              </View>

              {/* Case Battery */}
              <View style={styles.debugRow}>
                <Text style={styles.debugLabel}>Case Battery:</Text>
                <Text style={styles.debugValue}>
                  {caseBatteryLevel !== undefined && caseBatteryLevel !== null ? `${caseBatteryLevel}%` : '--%'}
                </Text>
              </View>

              {/* Case Temperature */}
              <View style={styles.debugRow}>
                <Text style={styles.debugLabel}>Case Temperature:</Text>
                <Text style={styles.debugValue}>
                  {!isNaN(caseTemperature) && caseTemperature !== undefined && caseTemperature !== null 
                    ? formatTemperature(caseTemperature) 
                    : '--° C'}
                </Text>
              </View>

              {/* Last Data Time */}
              <View style={styles.debugRow}>
                <Text style={styles.debugLabel}>Last Data:</Text>
                <Text style={styles.debugValue}>
                  {debugInfo.lastDataTime 
                    ? new Date(debugInfo.lastDataTime).toLocaleTimeString() 
                    : 'Never'}
                </Text>
              </View>

              {/* Query Attempts */}
              <View style={styles.debugRow}>
                <Text style={styles.debugLabel}>Query Attempts:</Text>
                <Text style={styles.debugValue}>{debugInfo.queryAttempts}</Text>
              </View>

              {/* Data Received Count */}
              <View style={styles.debugRow}>
                <Text style={styles.debugLabel}>Data Received:</Text>
                <Text style={[styles.debugValue, debugInfo.dataReceivedCount > 0 ? styles.debugSuccess : styles.debugWarning]}>
                  {debugInfo.dataReceivedCount || 0} times
                </Text>
              </View>

              {/* Periodic Query Status */}
              <View style={styles.debugRow}>
                <Text style={styles.debugLabel}>Periodic Query:</Text>
                <Text style={[styles.debugValue, debugInfo.periodicQueryActive ? styles.debugSuccess : styles.debugError]}>
                  {debugInfo.periodicQueryActive ? '✅ Active' : '❌ Inactive'}
                </Text>
              </View>

              {/* Last Valid Battery */}
              {debugInfo.lastValidBattery !== null && (
                <View style={styles.debugRow}>
                  <Text style={styles.debugLabel}>Last Valid Battery:</Text>
                  <Text style={styles.debugValue}>
                    {debugInfo.lastValidBattery}%
                  </Text>
                </View>
              )}

              {/* Last Valid Temperature */}
              {debugInfo.lastValidTemp !== null && (
                <View style={styles.debugRow}>
                  <Text style={styles.debugLabel}>Last Valid Temp:</Text>
                  <Text style={styles.debugValue}>
                    {debugInfo.lastValidTemp}°C
                  </Text>
                </View>
              )}

              {/* Current Values Status */}
              <View style={styles.debugRow}>
                <Text style={styles.debugLabel}>Values Status:</Text>
                <Text style={[styles.debugValue, (caseBatteryLevel > 0 || caseTemperature > 0) ? styles.debugSuccess : styles.debugWarning]}>
                  {(caseBatteryLevel > 0 || caseTemperature > 0) ? '✅ Showing' : '⚠️ Missing'}
                </Text>
              </View>

              {/* Issue Diagnosis */}
              <View style={styles.debugRow}>
                <Text style={styles.debugLabel}>Issue Diagnosis:</Text>
                <Text style={[styles.debugValue, styles.debugValueSmall]} numberOfLines={3}>
                  {(() => {
                    if (!isConnected) return '❌ Not Connected';
                    if (debugInfo.dataReceivedCount === 0) {
                      return '⚠️ Case Issue: No data received from device';
                    }
                    if (caseBatteryLevel === 0 && caseTemperature === 0 && debugInfo.dataReceivedCount > 0) {
                      return '⚠️ App Issue: Data received but values not updating';
                    }
                    if (!debugInfo.periodicQueryActive) {
                      return '⚠️ App Issue: Periodic query inactive';
                    }
                    return '✅ All Good';
                  })()}
                </Text>
              </View>

              {/* Connection State Details */}
              <View style={styles.debugRow}>
                <Text style={styles.debugLabel}>BLE State:</Text>
                <Text style={styles.debugValueSmall}>
                  {BLEManager.isConnected ? 'Connected' : 'Disconnected'} | 
                  Scanning: {BLEManager.isScanning ? 'Yes' : 'No'} |
                  Query Active: {debugInfo.periodicQueryActive ? 'Yes' : 'No'}
                </Text>
              </View>

              {/* Notification Status */}
              <View style={styles.debugRow}>
                <Text style={styles.debugLabel}>Notifications:</Text>
                <Text style={[styles.debugValue, (debugInfo.dataReceivedCount > 0) ? styles.debugSuccess : styles.debugError]}>
                  {debugInfo.dataReceivedCount > 0 ? '✅ Enabled (data received)' : '❌ Not working (no data)'}
                </Text>
              </View>

              {/* Troubleshooting Steps */}
              {isConnected && debugInfo.dataReceivedCount === 0 && (
                <View style={styles.debugRow}>
                  <Text style={styles.debugLabel}>Troubleshooting:</Text>
                  <Text style={[styles.debugValue, styles.debugValueSmall]} numberOfLines={4}>
                    1. Check if notifications enabled in native{'\n'}
                    2. Try disconnect & reconnect{'\n'}
                    3. Check device logs for onCharacteristicChanged{'\n'}
                    4. Verify GATT connection is stable
                  </Text>
                </View>
              )}

              {/* Last Error */}
              {debugInfo.lastError && (
                <View style={styles.debugRow}>
                  <Text style={styles.debugLabel}>Last Error:</Text>
                  <Text style={[styles.debugValue, styles.debugError]} numberOfLines={2}>
                    {debugInfo.lastError}
                  </Text>
                </View>
              )}

              {/* Raw Data Preview */}
              {debugInfo.rawData && (
                <View style={styles.debugRow}>
                  <Text style={styles.debugLabel}>Last Raw Data:</Text>
                  <Text style={styles.debugValueSmall} numberOfLines={3}>
                    {(() => {
                      // Check if rawData has hex string
                      if (debugInfo.rawDataHex) {
                        const cmd = debugInfo.rawDataHex.substring(0, 2);
                        const cmdMap = {
                          '04': 'PowerBankStatus',
                          '03': 'ChargerConfig',
                          '21': 'EnableCharging ACK',
                          '18': 'StopCharging ACK',
                          '19': 'Password ACK',
                        };
                        const cmdName = cmdMap[cmd] || `Unknown (0x${cmd})`;
                        return `[${cmdName}] ${debugInfo.rawDataHex.substring(0, 60)}${debugInfo.rawDataHex.length > 60 ? '...' : ''}`;
                      }
                      // Fallback to parsed data
                      return typeof debugInfo.rawData === 'string' 
                        ? debugInfo.rawData.substring(0, 80) + '...' 
                        : JSON.stringify(debugInfo.rawData).substring(0, 80) + '...';
                    })()}
                  </Text>
                </View>
              )}

              {/* Last Device Response */}
              {debugInfo.lastDeviceResponse && (
                <View style={styles.debugRow}>
                  <Text style={styles.debugLabel}>Last Response:</Text>
                  <Text style={styles.debugValueSmall}>
                    {debugInfo.lastDeviceResponse}
                  </Text>
                </View>
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
  debugToggle: {
    marginHorizontal: 20,
    marginTop: 10,
    padding: 10,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    alignItems: 'center',
  },
  debugToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  debugPanel: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#F8F8F8',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1D2733',
    marginBottom: 12,
  },
  debugRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingVertical: 4,
  },
  debugLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
    flex: 1,
  },
  debugValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1D2733',
    flex: 1,
    textAlign: 'right',
  },
  debugValueSmall: {
    fontSize: 11,
    fontWeight: '400',
    color: '#666',
    flex: 1,
    textAlign: 'right',
  },
  debugSuccess: {
    color: '#28A745',
  },
  debugError: {
    color: '#DC3545',
  },
  debugWarning: {
    color: '#FFC107',
  },
});

export default HomeScreen;
