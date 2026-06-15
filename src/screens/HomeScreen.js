import React, {useState, useEffect, useRef, useMemo, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  TouchableOpacity,
  PanResponder,
  StatusBar,
  Dimensions,
  SafeAreaView,
  Platform,
  ScrollView,
  PermissionsAndroid,
  AppState,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import {useIsFocused} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import BLEManager from '../services/BLEManagerNative';
import {BLE_CONSTANTS} from '../constants/BLEConstants';
import {saveHistoryEntry} from '../storage/HistoryStorage';
import PermissionModal from '../components/PermissionModal';
import {showErrorToast, showInfoToast} from '../utils/toastHelper';
import NotificationService from '../services/NotificationService';
const {width, height} = Dimensions.get('window');

// iOS HomeVC: after `queryChargerConfigStatus`, interaction is applied after ~2.5s.
const IOS_CHARGER_CONFIG_UI_DELAY_MS = 2500;
// iOS SlideBasedTimerHandler: poll power status while waiting for charging to flip.
const IOS_CHARGING_ACTION_POLL_MS = 1000;
const IOS_CHARGING_ACTION_MAX_WAIT_MS = 20000;

/** iOS UserDefaults parity: min-battery toast only at 20/10/5/0% bands while vcBelowMin. */
const STORAGE_LAST_MIN_BATTERY_ALERT = '@ipowerup:last_min_battery_alert_level';
const STORAGE_LAST_MAX_BATTERY_ALERT = '@ipowerup:last_max_battery_alert_level';

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
  const celsius = tempCelsius;
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
  const [phoneName, setPhoneName] = useState("User's Phone");
  const [phoneBatteryLevel, setPhoneBatteryLevel] = useState(0);
  const [caseBatteryLevel, setCaseBatteryLevel] = useState(0);
  const [caseTemperature, setCaseTemperature] = useState(0);
  const [caseDeviceName, setCaseDeviceName] = useState('');
  const [caseMacLast4, setCaseMacLast4] = useState('');
  const [temperatureUnit, setTemperatureUnit] = useState('fahrenheit');
  const [isCharging, setIsCharging] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [hasBluetoothPermission, setHasBluetoothPermission] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false); // First modal — "Allow/Don't Allow" Bluetooth
  const [showScanningModal, setShowScanningModal] = useState(false); // Scanning modal after permission
  const [allDiscoveredDevices, setAllDiscoveredDevices] = useState([]); // Devices for scanning modal
  const [chargeConfigEnabled, setChargeConfigEnabled] = useState(false); // Phone charging enabled in config
  const [isChargeConfigKnown, setIsChargeConfigKnown] = useState(false);
  /** After charger config (iOS delays enabling the toggle ~2.5s). */
  const [transferButtonUiReady, setTransferButtonUiReady] = useState(false);
  /** After start/stop command: disable until status catches up (iOS SlideBasedTimerHandler). */
  const [chargingCommandPending, setChargingCommandPending] = useState(false);
  const [phoneCharging, setPhoneCharging] = useState(false); // Actual phone charging status from PowerBankStatus
  const [usbCharging, setUsbCharging] = useState(false); // USB charging status from PowerBankStatus
  const [bellIsRed, setBellIsRed] = useState(false);
  const batteryIntervalRef = useRef(null);
  const lastBatteryAlertLevelRef = useRef(null);
  const bleHistorySyncedRef = useRef(false);
  // Security alert flags (temp only — battery uses AsyncStorage thresholds like iOS)
  const [alertFlags, setAlertFlags] = useState({
    tcBelowMinShown: false,
    tcAboveMaxShown: false,
  });
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
  const chargerConfigUiDelayTimerRef = useRef(null);
  const chargingActionPollRef = useRef(null);
  const chargingActionMaxTimerRef = useRef(null);
  const chargingActionExpectedRef = useRef(null);
  /** iOS only delays the first charger-config interaction (counting <= 1); later configs apply immediately. */
  const chargerConfigUiDelayCompletedRef = useRef(false);
  /** Ignore duplicate charger-config packets (same enPhCharger) to avoid timer reset / enable-disable flicker. */
  const lastChargerConfigModeKeyRef = useRef(null);

  const cancelChargerConfigUiDelayTimer = useCallback(() => {
    if (chargerConfigUiDelayTimerRef.current) {
      clearTimeout(chargerConfigUiDelayTimerRef.current);
      chargerConfigUiDelayTimerRef.current = null;
    }
  }, []);

  const cancelChargingActionTimers = useCallback(() => {
    if (chargingActionPollRef.current) {
      clearInterval(chargingActionPollRef.current);
      chargingActionPollRef.current = null;
    }
    if (chargingActionMaxTimerRef.current) {
      clearTimeout(chargingActionMaxTimerRef.current);
      chargingActionMaxTimerRef.current = null;
    }
    chargingActionExpectedRef.current = null;
  }, []);

  const clearCaseTelemetry = useCallback(() => {
    cancelChargerConfigUiDelayTimer();
    cancelChargingActionTimers();
    chargerConfigUiDelayCompletedRef.current = false;
    lastChargerConfigModeKeyRef.current = null;
    lastBatteryAlertLevelRef.current = null;
    bleHistorySyncedRef.current = false;
    setTransferButtonUiReady(false);
    setChargingCommandPending(false);
    setCaseBatteryLevel(0);
    setCaseTemperature(0);
    setIsCharging(false);
    setPhoneCharging(false);
    setUsbCharging(false);
    setChargeConfigEnabled(false);
    setIsChargeConfigKnown(false);
    setCaseMacLast4('');
    setBellIsRed(false);
  }, [cancelChargerConfigUiDelayTimer, cancelChargingActionTimers]);

  /** Last 4 hex digits of case MAC; works on reconnect when delegate missed onConnected. */
  const applyCaseMacFromBle = useCallback((deviceFromEvent = null) => {
    try {
      const d =
        deviceFromEvent ||
        (typeof BLEManager.getConnectedDeviceInfo === 'function'
          ? BLEManager.getConnectedDeviceInfo()
          : null);
      if (!d) {
        return;
      }
      const raw = String(d.address || d.id || '').trim();
      if (!raw) {
        return;
      }
      const hex = raw.replace(/:/g, '').toUpperCase();
      if (hex.length >= 4) {
        setCaseMacLast4(hex.slice(-4));
      }
    } catch (e) {
      console.warn('applyCaseMacFromBle:', e);
    }
  }, []);

  /** iOS handleMinBattery: only when vcBelowMin and level hits 20/10/5/0% bands (not e.g. 30%). */
  const processMinBatteryThresholdToast = useCallback(
    async (level, isBelowMin) => {
      if (typeof level !== 'number' || level < 0 || level > 100) {
        return;
      }
      if (level > 20) {
        try {
          await AsyncStorage.setItem(STORAGE_LAST_MIN_BATTERY_ALERT, '100');
        } catch (e) {}
        return;
      }
      if (!isBelowMin) {
        return;
      }
      let lastAlerted = 100;
      try {
        const raw = await AsyncStorage.getItem(STORAGE_LAST_MIN_BATTERY_ALERT);
        if (raw != null && raw !== '') {
          lastAlerted = parseInt(raw, 10);
        }
        if (Number.isNaN(lastAlerted)) {
          lastAlerted = 100;
        }
      } catch (e) {}
      const asc = [0, 5, 10, 20];
      const threshold = asc.find(th => level <= th);
      if (threshold === undefined) {
        return;
      }
      if (lastAlerted === threshold) {
        return;
      }
      if (!(lastAlerted === 0 || threshold < lastAlerted)) {
        return;
      }
      try {
        await AsyncStorage.setItem(STORAGE_LAST_MIN_BATTERY_ALERT, String(threshold));
      } catch (e) {}
      const msg = t(
        'alerts.caseBatteryBelowCharge',
        'Case battery charge below minimum. Please charge.',
      );
      const title = t('alerts.criticalBatteryTitle', 'Critical battery');
      showErrorToast(`${title}: ${msg}`, 5500);
    },
    [t],
  );

  /** iOS handleMaxBattery: vcAboveMax + 80/85/90/95% escalation. */
  const processMaxBatteryThresholdToast = useCallback(
    async (level, isAboveMax) => {
      if (typeof level !== 'number' || level < 0 || level > 100) {
        return;
      }
      if (level < 80) {
        try {
          await AsyncStorage.setItem(STORAGE_LAST_MAX_BATTERY_ALERT, '0');
        } catch (e) {}
        return;
      }
      if (!isAboveMax) {
        return;
      }
      let lastAlerted = 0;
      try {
        const raw = await AsyncStorage.getItem(STORAGE_LAST_MAX_BATTERY_ALERT);
        if (raw != null && raw !== '') {
          lastAlerted = parseInt(raw, 10);
        }
        if (Number.isNaN(lastAlerted)) {
          lastAlerted = 0;
        }
      } catch (e) {}
      const maxT = [80, 85, 90, 95];
      let threshold = null;
      for (let i = maxT.length - 1; i >= 0; i--) {
        if (level >= maxT[i]) {
          threshold = maxT[i];
          break;
        }
      }
      if (threshold === null) {
        return;
      }
      if (lastAlerted === threshold) {
        return;
      }
      if (!(threshold > lastAlerted)) {
        return;
      }
      try {
        await AsyncStorage.setItem(STORAGE_LAST_MAX_BATTERY_ALERT, String(threshold));
      } catch (e) {}
      showInfoToast(
        t('alerts.caseBatteryHigh', 'Case battery above maximum. Stop charging.'),
        5500,
      );
    },
    [t],
  );

  const BATTERY_ALERT_LEVELS = new Set([1, 5, 10, 20, 80, 90, 95, 100]);

  const showBatteryLevelToastIfNeeded = useCallback((caseBatPct) => {
    if (!BATTERY_ALERT_LEVELS.has(caseBatPct)) return;
    if (lastBatteryAlertLevelRef.current === caseBatPct) return;
    lastBatteryAlertLevelRef.current = caseBatPct;

    let title = '', body = '', isCritical = false;
    if (caseBatPct === 1 || caseBatPct === 5) {
      title = 'Critical Battery Level';
      body = `Case battery is critically low at ${caseBatPct}%. Please charge immediately.`;
      isCritical = true;
    } else if (caseBatPct === 10) {
      title = 'Low Battery';
      body = `Case battery is low at ${caseBatPct}%. Consider charging soon.`;
      isCritical = true;
    } else if (caseBatPct === 20) {
      title = 'Battery Level Alert';
      body = `Case battery is at ${caseBatPct}%.`;
    } else if (caseBatPct === 80) {
      title = 'Battery Level Good';
      body = `Case battery is at ${caseBatPct}%.`;
    } else if (caseBatPct === 90) {
      title = 'Battery Almost Full';
      body = `Case battery is almost full at ${caseBatPct}%.`;
    } else if (caseBatPct === 95) {
      title = 'Battery Full';
      body = `Case battery is nearly full at ${caseBatPct}%.`;
    } else if (caseBatPct === 100) {
      title = 'Battery Fully Charged';
      body = 'Case battery is fully charged at 100%.';
    }
    if (!title) return;

    if (isCritical) {
      showErrorToast(title, 6000, body);
    } else {
      showInfoToast(title, 5500, body);
    }
    NotificationService.sendBatteryNotification(title, body, isCritical);
  }, []);

  const updateBellIcon = useCallback((caseBatPct) => {
    if (!isConnected || caseBatPct === 0) {
      setBellIsRed(false);
      return;
    }
    setBellIsRed(caseBatPct < 20 || caseBatPct > 80);
  }, [isConnected]);

  const beginChargingActionWait = useCallback(
    expectedPhoneCharging => {
      cancelChargingActionTimers();
      chargingActionExpectedRef.current = expectedPhoneCharging;
      setChargingCommandPending(true);
      chargingActionPollRef.current = setInterval(() => {
        if (BLEManager.isConnected && BLEManager.queryPowerBankStatus) {
          BLEManager.queryPowerBankStatus().catch(() => {});
        }
      }, IOS_CHARGING_ACTION_POLL_MS);
      chargingActionMaxTimerRef.current = setTimeout(() => {
        chargingActionMaxTimerRef.current = null;
        cancelChargingActionTimers();
        setChargingCommandPending(false);
      }, IOS_CHARGING_ACTION_MAX_WAIT_MS);
    },
    [cancelChargingActionTimers],
  );

  useEffect(() => {
    if (!chargingCommandPending) {
      return;
    }
    const expected = chargingActionExpectedRef.current;
    if (expected === null) {
      return;
    }
    if (phoneCharging === expected) {
      cancelChargingActionTimers();
      setChargingCommandPending(false);
    }
  }, [phoneCharging, chargingCommandPending, cancelChargingActionTimers]);

  const canPressTransferPower = useMemo(
    () =>
      isConnected &&
      isChargeConfigKnown &&
      chargeConfigEnabled &&
      transferButtonUiReady &&
      !chargingCommandPending,
    [
      isConnected,
      isChargeConfigKnown,
      chargeConfigEnabled,
      transferButtonUiReady,
      chargingCommandPending,
    ],
  );

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
          // Android 12+ — only BLE scan + connect needed, no location
          const scanCheck = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN);
          const connectCheck = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
          if (scanCheck && connectCheck) {
            setHasBluetoothPermission(true);
            return true;
          }
          return false;
        } else {
          // Android 11 and below — BLE scan is sufficient, no location required
          const scanCheck = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN);
          if (scanCheck) {
            setHasBluetoothPermission(true);
            return true;
          }
          return false;
        }
      } else {
        // iOS — handled via Info.plist, no runtime request needed
        setHasBluetoothPermission(true);
        return true;
      }
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  };

  // Request Bluetooth permissions (no location)
  const requestBluetoothPermissions = async () => {
    try {
      if (Platform.OS === 'android') {
        const androidVersion = Platform.Version;
        if (androidVersion >= 31) {
          // Android 12+ — request only BLE permissions, no location
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          ]);
          const allGranted =
            granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED &&
            granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED;
          if (allGranted) {
            setHasBluetoothPermission(true);
            setShowScanningModal(true);
            checkAndEnableBluetooth().then(() => {
              setupBLEManager();
            }).catch(() => {
              setupBLEManager();
            });
          } else {
            showErrorToast(
              'Bluetooth permission required. Open system Settings to enable Bluetooth.',
              5000,
            );
          }
        } else {
          // Android 11 and below — request only BLE scan, no location
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          );
          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            setHasBluetoothPermission(true);
            setShowScanningModal(true);
            checkAndEnableBluetooth().then(() => {
              setupBLEManager();
            }).catch(() => {
              setupBLEManager();
            });
          } else {
            showErrorToast(
              'Bluetooth permission required. Open system Settings to enable it.',
              5000,
            );
          }
        }
      } else {
        // iOS — permissions handled by system
        setHasBluetoothPermission(true);
        setShowScanningModal(true);
        checkAndEnableBluetooth().then(() => {
          setupBLEManager();
        }).catch(() => {
          setupBLEManager();
        });
      }
    } catch (error) {
      console.error('Permission request error:', error);
      showErrorToast(
        'Failed to request permissions. Try again or enable them in system Settings.',
        5000,
      );
    }
  };

  // Check Bluetooth state and show alert if OFF (pure BLE library, no native module)
  const checkAndEnableBluetooth = async () => {
    try {
      const state = await BLEManager.getBluetoothState();
      console.log('📶 Current Bluetooth state:', state);
      
      if (state === 'PoweredOff') {
        showInfoToast(
          'Bluetooth is off. Turn on Bluetooth in system Settings to scan for your case.',
          5000,
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

    // Request push notification permission on mount (regardless of allow/deny)
    NotificationService.requestPermission();

    // Get initial phone battery
    getPhoneBatteryLevel();
    
    // Sync connection state on mount (prefer "real" connection with data)
    try {
      if (BLEManager.isReallyConnected) {
        setIsConnected(BLEManager.isReallyConnected());
      } else {
        setIsConnected(!!BLEManager.isConnected);
      }
    } catch (e) {
      console.warn('⚠️ Failed to read initial real connection state:', e);
      setIsConnected(!!BLEManager.isConnected);
    }
    
    // Check permissions — if already granted skip modal, else show Allow/Don't Allow modal
    checkBluetoothPermissions().then((hasPermission) => {
      if (hasPermission) {
        console.log('✅ Permissions already granted, starting BLE scan...');
        setupBLEManager();
      } else {
        console.log('⏳ Showing Bluetooth permission modal...');
        setShowPermissionModal(true);
      }
    });
    
    // Periodic battery check (react-native-device-info doesn't have listener, so we poll)
    batteryIntervalRef.current = setInterval(() => {
      getPhoneBatteryLevel();
    }, 5000);
    
    // Sync connection state periodically (in case it changes externally)
      const connectionSyncInterval = setInterval(() => {
      // Prefer "real" connection (BLE + at least one data packet) to avoid
      // showing Connected state when no values are coming from the device
      let currentConnected = !!BLEManager.isConnected;
      try {
        if (BLEManager.isReallyConnected) {
          currentConnected = BLEManager.isReallyConnected();
        }
      } catch (e) {
        console.warn('⚠️ Failed to read real connection state in sync interval:', e);
      }
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
        if (!currentConnected) {
          clearCaseTelemetry();
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
      if (chargerConfigUiDelayTimerRef.current) {
        clearTimeout(chargerConfigUiDelayTimerRef.current);
        chargerConfigUiDelayTimerRef.current = null;
      }
      if (chargingActionPollRef.current) {
        clearInterval(chargingActionPollRef.current);
        chargingActionPollRef.current = null;
      }
      if (chargingActionMaxTimerRef.current) {
        clearTimeout(chargingActionMaxTimerRef.current);
        chargingActionMaxTimerRef.current = null;
      }
      BLEManager.stopPeriodicQueries();
      BLEManager.stopScanning();
    };
  }, []);

  // ✅ FIX: AppState listener for background/foreground handling (matches iOS behavior)
  // Stop scanning when app goes to background to prevent battery drain
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      console.log('📱 AppState changed:', nextAppState);
      
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App going to background - stop scanning to save battery
        console.log('🛑 App going to background - stopping BLE scanning');
        // Stop scanning if active
        if (BLEManager.stopScanning) {
          BLEManager.stopScanning().catch((error) => {
            console.error('Error stopping scan on background:', error);
          });
        }
        // Also stop periodic queries if connected
        if (BLEManager.isConnected && BLEManager.stopPeriodicQueries) {
          BLEManager.stopPeriodicQueries();
        }
      } else if (nextAppState === 'active') {
        // App coming to foreground - resume scanning only if needed
        console.log('✅ App coming to foreground');
        // Don't auto-start scanning - let user manually start if needed
        // This matches iOS behavior where scanning doesn't auto-resume
      }
    });

    return () => {
      subscription?.remove();
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

  // Reload temperature unit when screen is focused
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

  // Re-attach Home delegate whenever screen regains focus.
  // This avoids missing callbacks if another screen replaced BLE delegate.
  useEffect(() => {
    if (isFocused) {
      setupBLEManager({startScanIfNeeded: false});
      if (!BLEManager.isConnected) {
        setIsConnected(false);
        clearCaseTelemetry();
      } else {
        applyCaseMacFromBle();
      }
    }
  }, [isFocused, clearCaseTelemetry, applyCaseMacFromBle]);

  const loadUserData = async () => {
    try {
      // Always read temperature unit first — independent of login state
      const savedTempUnit = await AsyncStorage.getItem('@ipowerup:temperature_unit');
      if (savedTempUnit) {
        setTemperatureUnit(savedTempUnit);
      }

      const userData = await AsyncStorage.getItem('loggedInUser');
      if (userData) {
        const user = JSON.parse(userData);
        setUserName((user.full_name || user.first_name || 'User').trim());
        setCaseDeviceName(user.case_device_name || '');
        // Fallback for old installs that saved temp inside user object
        if (!savedTempUnit && user.tempreture) {
          setTemperatureUnit(user.tempreture);
        }
      }
      if (typeof DeviceInfo.getDeviceName === 'function') {
        const deviceName = await DeviceInfo.getDeviceName();
        if (deviceName) {
          setPhoneName(deviceName);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const setupBLEManager = ({startScanIfNeeded = true} = {}) => {
    // Set phone battery getter
    BLEManager.setPhoneBatteryGetter(getPhoneBatteryLevel);
    
    // Set delegate
    BLEManager.setDelegate({
      onBluetoothStateChange: (state) => {
        console.log('📶 Bluetooth state changed to:', state);
        if (state === 'PoweredOff') {
          setShowScanningModal(false);
          setIsConnected(false);
          clearCaseTelemetry();
          BLEManager.stopPeriodicQueries();
          // Show the Allow/Don't Allow modal so user can re-enable Bluetooth
          setShowPermissionModal(true);
        } else if (state === 'PoweredOn') {
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
        setIsConnected(true);
        applyCaseMacFromBle(device);
        // Reset charging states when connecting
        setUsbCharging(false);
        setPhoneCharging(false);
        setIsCharging(false);
        // Prevent "enabled then disabled" flicker: keep disabled until config actually arrives.
        setChargeConfigEnabled(false);
        setIsChargeConfigKnown(false);
        cancelChargerConfigUiDelayTimer();
        cancelChargingActionTimers();
        chargerConfigUiDelayCompletedRef.current = false;
        lastChargerConfigModeKeyRef.current = null;
        setTransferButtonUiReady(false);
        setChargingCommandPending(false);
        // Close scanning modal when connected
        setShowScanningModal(false);
        // Start periodic queries immediately. Stop any existing periodic query first,
        // then start fresh to ensure periodic query is active on reconnect.
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
        
        // Query immediately after connection (with small delay for Android) and then let
        // periodic queries handle continuous updates, with multiple retry attempts to
        // ensure data is received.
        const sendInitialQuery = (attempt = 1, maxAttempts = 5) => {
          const delays = [2000, 3000, 4000, 5000, 6000]; // Increasing delays
          const delay = delays[attempt - 1] || 6000;
          
          setTimeout(() => {
            if (BLEManager.isConnected) {
              console.log(`🔍 Sending initial queryPowerBankStatus (attempt ${attempt}/${maxAttempts})...`);
              
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
        
        // Start initial query with multiple retries for reliability
        sendInitialQuery(1, 5);
        
        // CRITICAL: Check if data received after 10 seconds. If no data received,
        // it's likely a case issue.
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
        // iOS-like behavior: disconnected case should immediately clear case values.
        clearCaseTelemetry();
        
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
        
        // ✅ FIX: NO auto-scanning after disconnect (matches iOS behavior)
        // iOS app doesn't auto-scan after disconnect to prevent battery drain
        // User must manually start scanning if they want to reconnect
        console.log('📌 Disconnected - scanning stopped. User must manually start scanning to reconnect.');
      },
      
      onDataReceived: async (data) => {
        console.log('📥 HomeScreen: onDataReceived called with:', data);
        
        // Increment data received count FIRST for this packet
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
        
        if (data && typeof data.caseBatPct === 'number') {
          setTimeout(() => {
            if (BLEManager.isConnected && BLEManager.queryChargerConfigStatus) {
              BLEManager.queryChargerConfigStatus();
            }
          }, 1400);
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
          showBatteryLevelToastIfNeeded(data.caseBatPct);
          updateBellIcon(data.caseBatPct);

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
        
        // Update charging states from PowerBankStatus (actual status, not config)
        const phoneChargingStatus = data?.phoneCharging === true;
        const usbChargingStatus = data?.usbCharging === true;
        console.log('🔌 USB Charging Status:', usbChargingStatus, '| Phone Charging Status:', phoneChargingStatus);
        
        // Only update charging status from PowerBankStatus (0x04), not from command responses (0x21, 0x18)
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
        
        // USB status is part of PowerBankStatus; we track it for button enable/disable logic
        // and always update from data, even if false, to keep it accurate.
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

        // Case battery warnings: iOS-style thresholds + toast (not blocking Alert).
        if (
          data &&
          typeof data.caseBatPct === 'number' &&
          data.caseBatPct >= 0 &&
          data.caseBatPct <= 100
        ) {
          await processMinBatteryThresholdToast(
            data.caseBatPct,
            data.vcBelowMin === true,
          );
          await processMaxBatteryThresholdToast(
            data.caseBatPct,
            data.vcAboveMax === true,
          );
        }

        if (data.tcBelowMin === true && !alertFlags.tcBelowMinShown) {
          setAlertFlags(prev => ({...prev, tcBelowMinShown: true}));
          showErrorToast(
            t('alerts.temperatureAlert', 'Temperature Alert'),
            6000,
            t('alerts.caseTempLow', 'Case temperature approaching low temperature shut-down.'),
          );
          NotificationService.sendTemperatureNotification('low');
        } else if (data.tcBelowMin === false && alertFlags.tcBelowMinShown) {
          setAlertFlags(prev => ({...prev, tcBelowMinShown: false}));
        }

        if (data.tcAboveMax === true && !alertFlags.tcAboveMaxShown) {
          setAlertFlags(prev => ({...prev, tcAboveMaxShown: true}));
          showErrorToast(
            t('alerts.temperatureAlert', 'Temperature Alert'),
            6000,
            t('alerts.caseTempHigh', 'Case temperature approaching high temperature shut-down.'),
          );
          NotificationService.sendTemperatureNotification('high');
        } else if (data.tcAboveMax === false && alertFlags.tcAboveMaxShown) {
          setAlertFlags(prev => ({...prev, tcAboveMaxShown: false}));
        }
      },
      
      getTemperatureUnit: () => temperatureUnit,
      
      onScanError: (error) => {
        console.error('Scan error in Home:', error);
        setDebugInfo(prev => ({
          ...prev,
          lastError: `Scan error: ${error?.message || error}`,
        }));
        showErrorToast(error.message || 'Could not scan for devices.', 5000);
      },
      
      onPermissionError: (error) => {
        console.error('Permission error:', error);
        setDebugInfo(prev => ({
          ...prev,
          lastError: `Permission error: ${error?.message || error}`,
        }));
        showErrorToast(
          'Bluetooth permission required. Grant it in system Settings to connect to your case.',
          5000,
        );
      },
      
      // Charger config received - enable/disable button based on enPhCharger
      onChargerConfigReceived: (config) => {
        console.log('📊 Charger Config received:', config);
        // Protocol returns numeric mode: 0=off, 1=on, 2=auto
        // Treat ON/AUTO as actionable (iOS parity behavior).
        const mode = config?.enPhCharger;
        const modeKey =
          mode === undefined || mode === null ? '__none__' : String(mode);
        if (lastChargerConfigModeKeyRef.current === modeKey) {
          return;
        }
        lastChargerConfigModeKeyRef.current = modeKey;

        const isEnabled = mode === true || mode === 1 || mode === 2;
        cancelChargerConfigUiDelayTimer();
        setIsChargeConfigKnown(true);
        setChargeConfigEnabled(isEnabled);
        console.log('🔘 Transfer Power Button enabled:', isEnabled, '(enPhCharger:', mode, ')');

        setDebugInfo(prev => ({
          ...prev,
          lastError: null,
        }));

        // iOS HomeVC: first config(s) apply interaction after ~2.5s; later updates are immediate (counting > 1).
        if (!isEnabled) {
          setTransferButtonUiReady(false);
          chargerConfigUiDelayCompletedRef.current = false;
          return;
        }

        if (chargerConfigUiDelayCompletedRef.current) {
          setTransferButtonUiReady(true);
          return;
        }

        setTransferButtonUiReady(false);
        chargerConfigUiDelayTimerRef.current = setTimeout(() => {
          chargerConfigUiDelayTimerRef.current = null;
          if (!BLEManager.isConnected) {
            return;
          }
          chargerConfigUiDelayCompletedRef.current = true;
          setTransferButtonUiReady(true);
        }, IOS_CHARGER_CONFIG_UI_DELAY_MS);

        // Trigger BLE history sync once per connection after charger config is received
        if (!bleHistorySyncedRef.current && BLEManager.syncBleHistoryFromDevice) {
          bleHistorySyncedRef.current = true;
          setTimeout(() => {
            BLEManager.syncBleHistoryFromDevice().catch(e => {
              bleHistorySyncedRef.current = false;
              console.warn('BLE history sync failed:', e?.message || e);
            });
          }, 500);
        }
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
    
    // Start scanning immediately (auto-connect enabled by default)
    if (startScanIfNeeded && !BLEManager.isConnected) {
      // Enable auto-connect for HomeScreen
      BLEManager.isAutoScanEnabled = true;
      BLEManager.startScanning();
    } else if (BLEManager.isConnected) {
      // Already connected - just query status
      BLEManager.queryPowerBankStatus();
      applyCaseMacFromBle();
    }
  };

  const formatTemperature = (tempCelsius) => {
    // Convert to Fahrenheit if needed
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

  const THUMB_SIZE = 48;
  const THUMB_INSET = 6;
  const SLIDER_HEIGHT = 56;
  const SLIDER_BORDER = 2;
  const THUMB_VERTICAL_INSET = (SLIDER_HEIGHT - SLIDER_BORDER * 2 - THUMB_SIZE) / 2;
  const getThumbMaxX = (width) => width - SLIDER_BORDER * 2 - THUMB_SIZE - THUMB_INSET;
  const [sliderBtnWidth, setSliderBtnWidth] = useState(0);
  const sliderAnim = useRef(new Animated.Value(THUMB_INSET)).current;
  const isDragging = useRef(false);
  const [dragLabel, setDragLabel] = useState(null); // null = follow phoneCharging, 'stop'/'transfer' = drag override

  useEffect(() => {
    if (sliderBtnWidth === 0) return;
    const toX = phoneCharging
      ? getThumbMaxX(sliderBtnWidth)
      : THUMB_INSET;
    if (!isDragging.current) {
      Animated.spring(sliderAnim, {toValue: toX, friction: 7, tension: 40, useNativeDriver: true}).start();
    }
  }, [phoneCharging, sliderBtnWidth]);

  const thumbPanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => canPressTransferPower,
    onMoveShouldSetPanResponder: () => canPressTransferPower,
    onPanResponderGrant: () => {
      isDragging.current = true;
      sliderAnim.stopAnimation();
    },
    onPanResponderMove: (_, g) => {
      const baseX = phoneCharging ? getThumbMaxX(sliderBtnWidth) : THUMB_INSET;
      const minX = THUMB_INSET;
      const maxX = getThumbMaxX(sliderBtnWidth);
      const newX = Math.min(Math.max(minX, baseX + g.dx), maxX);
      sliderAnim.setValue(newX);
      // Arrow & label change when thumb center crosses button center (iOS exact)
      const thumbCenterX = newX + THUMB_SIZE / 2;
      setDragLabel(thumbCenterX > sliderBtnWidth / 2 ? 'stop' : 'transfer');
    },
    onPanResponderRelease: (_, g) => {
      isDragging.current = false;
      setDragLabel(null);
      const baseX = phoneCharging ? getThumbMaxX(sliderBtnWidth) : THUMB_INSET;
      const currentX = Math.min(Math.max(THUMB_INSET, baseX + g.dx), getThumbMaxX(sliderBtnWidth));
      const thumbCenterX = currentX + THUMB_SIZE / 2;
      const draggedPastCenter = thumbCenterX > sliderBtnWidth / 2;
      const shouldToggle = (!phoneCharging && draggedPastCenter) || (phoneCharging && !draggedPastCenter);
      if (shouldToggle) {
        Animated.spring(sliderAnim, {
          toValue: phoneCharging ? THUMB_INSET : getThumbMaxX(sliderBtnWidth),
          friction: 7, tension: 40, useNativeDriver: true,
        }).start();
        handleTransferPower();
      } else {
        Animated.spring(sliderAnim, {
          toValue: phoneCharging ? getThumbMaxX(sliderBtnWidth) : THUMB_INSET,
          friction: 7, tension: 40, useNativeDriver: true,
        }).start();
      }
    },
    onPanResponderTerminate: () => {
      isDragging.current = false;
      setDragLabel(null);
      const startX = phoneCharging ? getThumbMaxX(sliderBtnWidth) : THUMB_INSET;
      Animated.spring(sliderAnim, {toValue: startX, friction: 7, tension: 40, useNativeDriver: true}).start();
    },
  }), [phoneCharging, sliderBtnWidth, canPressTransferPower]);

  const handleTransferPower = () => {
    if (!isConnected) {
      setDebugInfo(prev => ({
        ...prev,
        lastError: 'Button pressed but not connected',
      }));
      showErrorToast('Case not connected', 4000, 'Connect your iPowerUp case first to transfer power.');
      return;
    }
    
    if (!isChargeConfigKnown) {
      showInfoToast('Reading charger config from case…', 3500);
      return;
    }

    if (!chargeConfigEnabled) {
      setDebugInfo(prev => ({
        ...prev,
        lastError: 'Button pressed but enPhCharger disabled',
      }));
      showInfoToast(
        'Phone charging is disabled in device configuration.',
        4500,
      );
      return;
    }

    if (!transferButtonUiReady) {
      showInfoToast(
        'Case is still applying charger settings. Try again in a moment.',
        4000,
      );
      return;
    }

    if (chargingCommandPending) {
      return;
    }

    const expectedNextPhoneCharging = !phoneCharging;
    beginChargingActionWait(expectedNextPhoneCharging);

    // Toggle based on ACTUAL phoneCharging status (use actual charging status, not config setting)
    if (phoneCharging) {
      // Phone is actually charging - send stop command (0x18)
      console.log('🛑 Stopping phone charging (0x18)...');
      setDebugInfo(prev => ({
        ...prev,
        lastError: null,
      }));
      BLEManager.stopCharging().catch((error) => {
        console.error('❌ Failed to stop charging:', error);
        cancelChargingActionTimers();
        setChargingCommandPending(false);
        setDebugInfo(prev => ({
          ...prev,
          lastError: `Stop charging failed: ${error?.message || error}`,
        }));
        showErrorToast('Failed to stop charging. Please try again.', 4500);
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
        cancelChargingActionTimers();
        setChargingCommandPending(false);
        setDebugInfo(prev => ({
          ...prev,
          lastError: `Enable charging failed: ${error?.message || error}`,
        }));
        showErrorToast('Failed to enable charging. Please try again.', 4500);
      });
    }
    
    // The periodic query (started in onConnected) will automatically update the status.
    // Additionally, we send a query after a short delay to get faster feedback.
    setTimeout(() => {
      if (BLEManager.isConnected && BLEManager.queryPowerBankStatus) {
        console.log('🔍 Querying PowerBankStatus after charging command to get updated status...');
        BLEManager.queryPowerBankStatus().catch((error) => {
          console.error('❌ Query after command failed:', error);
        });
      }
    }, 500); // 0.5 seconds delay - enough for device, but feels instant in UI
  };

  const caseSectionTitleSuffix = useMemo(() => {
    const trimmed = (caseDeviceName || '').trim();
    const localizedYourCase = t('home.yourCase');
    if (
      !trimmed ||
      trimmed === 'Your Case' ||
      trimmed === localizedYourCase ||
      trimmed.toLowerCase() === 'your case'
    ) {
      return t('home.caseShort', 'Case');
    }
    return trimmed;
  }, [caseDeviceName, t, i18n.language]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Permission Modal — "Allow/Don't Allow" shown on first launch or when BT is off */}
      <PermissionModal
        visible={showPermissionModal}
        onAllow={() => {
          setShowPermissionModal(false);
          requestBluetoothPermissions();
        }}
        onDontAllow={() => setShowPermissionModal(false)}
        permissionType="bluetooth"
        discoveredDevices={[]}
        deviceCount={0}
        hasPermissionGranted={false}
        showStaticDevices={true}
      />

      {/* Scanning Modal - Shows devices being discovered after permission granted */}
      <PermissionModal
        visible={showScanningModal}
        onAllow={() => setShowScanningModal(false)}
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
              {t('home.greetings')}, <Text style={styles.greetingName}>{userName}</Text>
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
              <Image
                source={bellIsRed ? require('../../assets/home/bell-icon.png') : require('../../assets/home/bell-icon-blue.png')}
                style={styles.bellIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>

          {/* Your Phone Section */}
          <Text style={styles.sectionTitle}>{phoneName}</Text>
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
          <Text style={styles.sectionTitle}>{`${userName.trim()}'s ${caseSectionTitleSuffix}`}</Text>
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
            <Text style={styles.caseMacText}>{isConnected ? `Case MAC (last 4): ${caseMacLast4 || '----'}` : 'No Case Connected'}</Text>
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
                <Text style={styles.cardSubtitle}>{t('home.temperatureLevel')}</Text>
              </View>
              <Image
                source={getTemperatureImage(caseTemperature, temperatureUnit)}
                style={styles.temperatureImage}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Transfer Power Button */}
          {/* 
            Button Logic (iOS parity):
            - Config known + enPhCharger allows transfer; UI enables ~2.5s after first good config (HomeVC).
            - After start/stop, interaction disabled until PowerBankStatus reflects change or timeout
              (SlideBasedTimerHandler-style poll).
            - Button shows YELLOW (Stop Charging) when phoneCharging == true
            - Button shows WHITE (Start Charging) when phoneCharging == false
          */}
          {(() => {
            const displayStop = dragLabel === 'stop' || (dragLabel === null && phoneCharging);
            const sliderBg = displayStop ? '#fde037' : '#FFFFFF';
            const labelText = displayStop
              ? t('home.stopCharging', 'Stop Charging')
              : t('home.transferPowerToPhone', 'Transfer Power To Phone');
            return (
              <View
                style={[styles.sliderButton, {borderRadius: SLIDER_HEIGHT / 2, backgroundColor: sliderBg, overflow: 'hidden', borderWidth: 2, borderColor: '#FFFFFF', opacity: canPressTransferPower ? 1 : 0.4}]}
                onLayout={e => setSliderBtnWidth(e.nativeEvent.layout.width)}
              >
                {/* Label centered with 60px padding each side (iOS: leading/trailing 60) */}
                <Text style={{position: 'absolute', width: '100%', textAlign: 'center', fontSize: 16, fontWeight: '500', color: '#1A1A1A', paddingHorizontal: 60}}>
                  {labelText}
                </Text>
                {/* Pan on thumb only — fixes accidental trigger on label tap */}
                <Animated.View
                  style={{
                    position: 'absolute',
                    top: THUMB_VERTICAL_INSET,
                    left: 0,
                    width: THUMB_SIZE,
                    height: THUMB_SIZE,
                    borderRadius: THUMB_SIZE / 2,
                    backgroundColor: '#0097d9',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: [{translateX: sliderAnim}],
                  }}
                  {...thumbPanResponder.panHandlers}
                >
                  <Image
                    source={displayStop
                      ? require('../../assets/icons/back-arrow-ios.png')
                      : require('../../assets/icons/right-arrow-ios.png')}
                    style={{width: 22, height: 22, tintColor: '#FFFFFF'}}
                    resizeMode="contain"
                  />
                </Animated.View>
              </View>
            );
          })()}

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
    height: 33,
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
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderImage: {
    width: '100%',
    height: 55,
  },
  caseMacText: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    fontSize: 12,
    color: '#646D77',
    fontWeight: '600',
  },
});

export default HomeScreen;
