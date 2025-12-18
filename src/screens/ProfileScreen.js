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
import {BLE_CONSTANTS} from '../constants/BLEConstants';
import {useIsFocused} from '@react-navigation/native';
// Use Native Kotlin BLE Manager (exact iOS match)
import BLEManager from '../services/BLEManagerNative';
import PermissionModal from '../components/PermissionModal';

const DEBUG_LOG_KEY = '@ipowerup:ble_debug_logs';
const MAX_DEBUG_LOGS = 50; // Keep last 50 connection attempts

const {width, height} = Dimensions.get('window');

const ProfileScreen = ({navigation}) => {
  const [isNotificationEnabled, setIsNotificationEnabled] = useState(true);
  const [isCaseConnected, setIsCaseConnected] = useState(false);
  const [connectedDeviceName, setConnectedDeviceName] = useState(null);
  const [showScanningModal, setShowScanningModal] = useState(false);
  const [allDiscoveredDevices, setAllDiscoveredDevices] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('idle'); // 'idle' | 'connecting' | 'connected' | 'error'
  const [connectionError, setConnectionError] = useState(null);
  const [protocolInfo, setProtocolInfo] = useState(null);
  const [debugLogs, setDebugLogs] = useState([]); // Persistent debug logs
  const [showDebugInfo, setShowDebugInfo] = useState(false); // Show debug on "No Case Connected"
  const isFocused = useIsFocused();
  const scanIntervalRef = useRef(null);

  // Load persistent debug logs
  useEffect(() => {
    loadDebugLogs();
  }, []);

  // Load debug logs from AsyncStorage
  const loadDebugLogs = async () => {
    try {
      const logsJson = await AsyncStorage.getItem(DEBUG_LOG_KEY);
      if (logsJson) {
        const logs = JSON.parse(logsJson);
        // Ensure logs is an array
        if (Array.isArray(logs)) {
          setDebugLogs(logs);
        } else {
          console.warn('Invalid logs format, resetting to empty array');
          setDebugLogs([]);
        }
      }
    } catch (error) {
      console.error('Error loading debug logs:', error);
      // Set empty array on error to prevent crash
      setDebugLogs([]);
    }
  };

  // Save debug log to AsyncStorage (async)
  const addDebugLog = async (type, message, data = {}) => {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        type, // 'connected', 'disconnected', 'error', 'connecting'
        message,
        data,
        connectionStatus: (BLEManager && BLEManager.isConnected) ? 'connected' : 'disconnected',
        deviceInfo: (BLEManager && BLEManager.getConnectedDeviceInfo) ? BLEManager.getConnectedDeviceInfo() : null,
        isScanning: (BLEManager && BLEManager.isScanning) || false,
        discoveredDevices: (BLEManager && BLEManager.getAllDiscoveredDevices) ? (BLEManager.getAllDiscoveredDevices()?.length || 0) : 0,
      };
      
      // CRITICAL: Load existing logs from AsyncStorage first (not from state)
      // State might not be updated yet, so we need to read from storage
      let currentLogs = [];
      try {
        const logsJson = await AsyncStorage.getItem(DEBUG_LOG_KEY);
        if (logsJson) {
          currentLogs = JSON.parse(logsJson);
          // Ensure it's an array
          if (!Array.isArray(currentLogs)) {
            currentLogs = [];
          }
        }
      } catch (storageError) {
        console.warn('Error loading existing logs from storage:', storageError);
        currentLogs = [];
      }
      
      // Add new log at the beginning (most recent first)
      const updatedLogs = [logEntry, ...currentLogs].slice(0, MAX_DEBUG_LOGS);
      
      // Save to AsyncStorage first (source of truth)
      await AsyncStorage.setItem(DEBUG_LOG_KEY, JSON.stringify(updatedLogs));
      
      // Update state for UI
      setDebugLogs(updatedLogs);
      
      console.log('📝 Debug log saved:', type, message, 'Total logs:', updatedLogs.length);
    } catch (error) {
      console.error('Error saving debug log:', error);
      // Try to at least update state with the new log
      const logEntry = {
        timestamp: new Date().toISOString(),
        type,
        message,
        data,
      };
      setDebugLogs(prev => [logEntry, ...prev].slice(0, MAX_DEBUG_LOGS));
    }
  };

  // Setup BLE delegate for ProfileScreen
  useEffect(() => {
    // CRITICAL: Check if BLEManager is available before setting delegate
    if (!BLEManager) {
      console.error('BLEManager not available, cannot set delegate');
      return;
    }
    
    // Set delegate to listen for connection changes
    if (BLEManager.setDelegate) {
    BLEManager.setDelegate({
      onConnected: (device) => {
        console.log('✅ ProfileScreen: onConnected callback called');
        console.log('✅ Device object:', device);
        console.log('✅ BLEManager.isConnected:', BLEManager ? BLEManager.isConnected : 'N/A');
        
        // Log to persistent debug
        addDebugLog('connected', 'Device connected successfully', {device});
        
        // Update status immediately
        setConnectionStatus('connected');
        setConnectionError(null);
        
        // Get device info
        const deviceInfo = (BLEManager && BLEManager.getConnectedDeviceInfo) ? BLEManager.getConnectedDeviceInfo() : null;
        console.log('✅ Connected device info:', deviceInfo);
        
        if (deviceInfo) {
          updateProtocolInfo({
            id: deviceInfo.id || device?.id,
            name: deviceInfo.name || device?.name,
          });
          
          setIsCaseConnected(true);
          if (deviceInfo.name) {
            setConnectedDeviceName(deviceInfo.name);
          } else if (device?.name) {
            setConnectedDeviceName(device.name);
          } else {
            setConnectedDeviceName(BLE_CONSTANTS.DEVICE_NAME);
          }
        } else {
          // Fallback if deviceInfo is null
          updateProtocolInfo({
            id: device?.id,
            name: device?.name,
          });
        }
        
        // iOS line 130-133: Password is sent 1 second after connection (handled in native)
        // iOS line 195-203: didConnect sets isConnected=true and discovers services
        // iOS line 262-263: didConnectPeripheral() immediately calls queryPowerBankStatus
        // iOS doesn't verify - connection is async, services discovered automatically
        // Start periodic queries and query status immediately (like iOS)
        if (BLEManager && BLEManager.startPeriodicQueries) {
          BLEManager.startPeriodicQueries();
        }
        // iOS: didConnectPeripheral() immediately queries (line 263)
        // Small delay to allow service/characteristic discovery
        setTimeout(() => {
          if (BLEManager && BLEManager.isConnected && BLEManager.queryPowerBankStatus) {
            BLEManager.queryPowerBankStatus();
          }
        }, 1500); // 1.5 seconds - services are discovered automatically
      },
      
      onDisconnected: (disconnectInfo) => {
        const reason = disconnectInfo?.reason || 'Unknown reason';
        const status = disconnectInfo?.status || -1;
        const timestamp = disconnectInfo?.timestamp || new Date().toISOString();
        const device = disconnectInfo?.device;
        
        console.log('🔌 ProfileScreen: Disconnected - Reason:', reason, 'Status:', status);
        
        // Log to persistent debug with full disconnect reason
        addDebugLog('disconnected', `Device disconnected: ${reason}`, {
          reason,
          status,
          timestamp,
          device: device ? {
            name: device.name,
            id: device.id,
            address: device.address,
          } : null,
          wasConnected: disconnectInfo?.wasConnected || false,
          wasConnecting: disconnectInfo?.wasConnecting || false,
          connectionState: {
            isConnected: (BLEManager && BLEManager.isConnected) || false,
            isScanning: BLEManager.isScanning,
            discoveredDevices: BLEManager.getAllDiscoveredDevices()?.length || 0,
          },
        });
        
        setConnectionStatus('idle');
        setConnectionError(reason); // Show disconnect reason as error
        setIsCaseConnected(false);
        setConnectedDeviceName(null);
      },
      
      onConnectionFailed: (error) => {
        console.error('❌ ProfileScreen: Connection failed:', error);
        
        // Log to persistent debug
        addDebugLog('error', 'Connection failed', {
          error: error?.message || error?.toString(),
          errorDetails: error,
        });
        
        setConnectionStatus('error');
        setConnectionError(error?.message || error?.toString() || 'Connection failed');
        setIsCaseConnected(false);
        setConnectedDeviceName(null);
      },
    });
    }
    
    return () => {
      // Cleanup - don't clear delegate as HomeScreen might be using it
      // Instead, just reset state
      setIsCaseConnected(false);
      setConnectedDeviceName(null);
      setConnectionStatus('idle');
      setConnectionError(null);
    };
  }, []);
  
  // CRITICAL: Add error boundary for BLEManager calls
  const safeBLEManagerCall = (fn, ...args) => {
    try {
      if (!BLEManager) {
        console.warn('BLEManager not available');
        return null;
      }
      if (typeof BLEManager[fn] === 'function') {
        return BLEManager[fn](...args);
      } else {
        console.warn(`BLEManager.${fn} is not a function`);
        return null;
      }
    } catch (error) {
      console.error(`Error calling BLEManager.${fn}:`, error);
      return null;
    }
  };
  
  const updateProtocolInfo = (deviceMeta) => {
    try {
      // Get discovered devices count
      const allDevices = BLEManager.getAllDiscoveredDevices();
      const connectedInfo = BLEManager.getConnectedDeviceInfo();
      
      const info = {
        serviceUUID: '000056ff-0000-1000-8000-00805f9b34fb',
        txUUID: '000033f3-0000-1000-8000-00805f9b34fb',
        rxUUID: '000033F4-0000-1000-8000-00805f9b34fb',
        writeType: 'writeWithoutResponse (iOS protocol)',
        deviceId: deviceMeta?.id || connectedInfo?.id || 'N/A',
        deviceName: deviceMeta?.name || connectedInfo?.name || 'N/A',
        isScanning: (BLEManager && BLEManager.isScanning) || false,
        isConnected: (BLEManager && BLEManager.isConnected) || false,
        discoveredCount: Array.isArray(allDevices) ? allDevices.length : 0,
        connectionStatus: connectionStatus || 'idle',
        lastError: connectionError || null,
      };
      setProtocolInfo(info);
    } catch (error) {
      console.error('Error updating protocol info:', error);
      // Set basic info even on error
      setProtocolInfo({
        serviceUUID: '000056ff-0000-1000-8000-00805f9b34fb',
        txUUID: '000033f3-0000-1000-8000-00805f9b34fb',
        rxUUID: '000033F4-0000-1000-8000-00805f9b34fb',
        writeType: 'writeWithoutResponse (iOS protocol)',
        deviceId: 'Error getting info',
        deviceName: 'Error getting info',
        isScanning: false,
        isConnected: false,
        discoveredCount: 0,
        connectionStatus: 'error',
        lastError: error.message || 'Unknown error',
      });
    }
  };

  // Sync BLE connection state when profile screen is focused
  useEffect(() => {
    if (isFocused) {
      const syncConnectionState = () => {
        try {
          // CRITICAL: Check if BLEManager is available
          if (!BLEManager) {
            console.warn('BLEManager not available');
            setIsCaseConnected(false);
            return;
          }
          
          // CRITICAL: Check BLEManager.isConnected directly (not deviceInfo.isConnected)
          // deviceInfo.isConnected doesn't exist - it's just device info
          const isConnected = !!(BLEManager.isConnected);
          const deviceInfo = BLEManager.getConnectedDeviceInfo ? BLEManager.getConnectedDeviceInfo() : null;
          
          // If connected, we should have device info
          if (isConnected && deviceInfo) {
            setIsCaseConnected(true);
          } else {
            setIsCaseConnected(false);
          }
          
          // Get connected device info safely
          if (isConnected && deviceInfo) {
            if (deviceInfo.name) {
              setConnectedDeviceName(deviceInfo.name);
            } else {
              setConnectedDeviceName(BLE_CONSTANTS.DEVICE_NAME);
            }
          } else {
            setConnectedDeviceName(null);
          }
        } catch (error) {
          console.error('Error syncing BLE state in ProfileScreen:', error);
          setIsCaseConnected(false);
          setConnectedDeviceName(null);
        }
      };
      
      // Sync immediately
      syncConnectionState();
      
      // Also sync periodically while focused (in case connection changes)
      const syncInterval = setInterval(syncConnectionState, 2000);
      
      return () => {
        clearInterval(syncInterval);
      };
    } else {
      // Reset when not focused
      setIsCaseConnected(false);
      setConnectedDeviceName(null);
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
    // iOS: mainViewScanning.isHidden = false, manager.startScanning() - line 212-217
    // iOS line 215: manager.isAutoScanEnabled = false (for ProfileScreen - manual connect)
    // Open modal on same screen and start BLE scan (no navigation)
    setShowScanningModal(true);
    setAllDiscoveredDevices([]);
    
    // iOS: manager.isAutoScanEnabled = false (ProfileScreen uses manual connect)
    BLEManager.isAutoScanEnabled = false;
    
    // iOS: manager.startScanning() - line 217
    if (BLEManager && BLEManager.startScanning) {
      try {
    BLEManager.startScanning();
      } catch (error) {
        console.error('Error starting scan:', error);
      }
    }

    // Poll BLEManager for newly discovered devices & connection state
    // iOS: tableView.reloadData() - line 224 (updates when devices discovered)
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }
    scanIntervalRef.current = setInterval(() => {
      try {
        // CRITICAL: Check if BLEManager is available
        if (!BLEManager) {
          return;
        }
        
        // iOS: manager.discoveredDevices - line 34
        const devices = (BLEManager.getDiscoveredDevices) ? BLEManager.getDiscoveredDevices() : [];
        // Safe array copy
        if (Array.isArray(devices)) {
          setAllDiscoveredDevices([...devices]);
        } else {
          setAllDiscoveredDevices([]);
        }

        // If connected, update UI and close modal
        // iOS: updateDeviceLable() - line 199-203
        if (BLEManager.isConnected) {
          try {
            const deviceInfo = (BLEManager.getConnectedDeviceInfo) ? BLEManager.getConnectedDeviceInfo() : null;
            if (deviceInfo) {
              setIsCaseConnected(true);
              if (deviceInfo.name) {
                setConnectedDeviceName(deviceInfo.name);
              } else {
                setConnectedDeviceName(BLE_CONSTANTS.DEVICE_NAME);
              }
              setShowScanningModal(false);
              if (BLEManager.stopScanning) {
              BLEManager.stopScanning();
              }
              if (scanIntervalRef.current) {
                clearInterval(scanIntervalRef.current);
                scanIntervalRef.current = null;
              }
            }
          } catch (error) {
            console.error('Error updating connection state:', error);
          }
        }
      } catch (intervalError) {
        console.error('Error in scan interval:', intervalError);
        // Don't crash - just log
      }
    }, 1000);
  };

  const handleCloseScanModal = () => {
    setShowScanningModal(false);
    if (BLEManager && BLEManager.stopScanning) {
      try {
    BLEManager.stopScanning();
      } catch (error) {
        console.error('Error stopping scan:', error);
      }
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
  };

  const handleConnectDeviceFromProfile = async (deviceMeta) => {
    try {
      if (!deviceMeta || !deviceMeta.id) {
        console.error('❌ Invalid device metadata:', deviceMeta);
        setConnectionStatus('error');
        setConnectionError('Invalid device selected. Please try again.');
        await addDebugLog('error', 'Invalid device selected', {deviceMeta});
        Alert.alert('Error', 'Invalid device selected. Please try again.');
        return;
      }
      
      console.log('🔌 Connecting to device:', deviceMeta.id, deviceMeta.name);
      
      // Log connection attempt (async - don't block)
      addDebugLog('connecting', `Connecting to ${deviceMeta.name || deviceMeta.id}`, {
        deviceId: deviceMeta.id,
        deviceName: deviceMeta.name,
        rssi: deviceMeta.rssi,
      });
      
      // Update status
      setConnectionStatus('connecting');
      setConnectionError(null);
      
      // Update protocol info
      updateProtocolInfo(deviceMeta);
      
      // Ensure scanning is active to keep device in discoveredDevices
      if (BLEManager && !BLEManager.isScanning && !BLEManager.isConnected) {
        console.log('🔄 Ensuring scan is active...');
        try {
          if (BLEManager.startScanning) {
          BLEManager.startScanning();
          }
        } catch (scanError) {
          const errorMsg = `Failed to start scanning: ${scanError.message || scanError}`;
          console.error('❌ Scan start error:', scanError);
          setConnectionStatus('error');
          setConnectionError(errorMsg);
          updateProtocolInfo(deviceMeta);
          return;
        }
      }
      
      // Small delay to ensure device is in discoveredDevices array
      // CRITICAL: Wrap in async function to properly handle async connectToDeviceById
      setTimeout(async () => {
        try {
          // connectToDeviceById is now async, so await it
          await BLEManager.connectToDeviceById(deviceMeta.id);
        } catch (connectError) {
          const errorMsg = `Connection failed: ${connectError?.message || connectError || 'Unknown error'}`;
          console.error('❌ Connect error:', connectError);
          console.error('Error details:', {
            message: connectError?.message,
            stack: connectError?.stack,
            name: connectError?.name,
          });
          setConnectionStatus('error');
          setConnectionError(errorMsg);
          updateProtocolInfo(deviceMeta);
          
          // Show alert to user
          Alert.alert('Connection Failed', errorMsg);
        }
      }, 100);
      
    } catch (error) {
      const errorMsg = `Unexpected error: ${error.message || error}`;
      console.error('❌ Error connecting to device:', error);
      setConnectionStatus('error');
      setConnectionError(errorMsg);
      updateProtocolInfo(deviceMeta || null);
      Alert.alert('Connection Error', errorMsg);
    }
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
        connectionStatus={connectionStatus}
        connectionError={connectionError}
        protocolInfo={protocolInfo}
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
                ? connectedDeviceName 
                  ? `Your ${connectedDeviceName} case is connected.`
                  : 'Your iPowerUp Uno case is connected.'
                : 'Searching for the Uno case, or Duo case?'}
            </Text>
            
            <TouchableOpacity
              style={styles.connectButton}
              onPress={startScanOnProfile}
              activeOpacity={0.8}
            >
              <Text style={styles.connectButtonText}>
                {(() => {
                  // Only show "Manage Device" if device is properly connected
                  const deviceInfo = (BLEManager && BLEManager.getConnectedDeviceInfo) ? BLEManager.getConnectedDeviceInfo() : null;
                  const isProperlyConnected = (BLEManager && BLEManager.isConnected) && 
                                            deviceInfo && 
                                            isCaseConnected;
                  return isProperlyConnected ? 'Manage Device' : 'Connect New Device';
                })()}
              </Text>
            </TouchableOpacity>

            {/* Debug Info Section - Show when "No Case Connected" */}
            {!isCaseConnected && (
              <View style={styles.debugContainer}>
                <TouchableOpacity
                  onPress={() => setShowDebugInfo(!showDebugInfo)}
                  style={styles.debugToggle}
                >
                  <Text style={styles.debugToggleText}>
                    {showDebugInfo ? '▼' : '▶'} Debug Info ({debugLogs.length} logs)
                  </Text>
                </TouchableOpacity>
                
                {showDebugInfo && (
                  <ScrollView 
                    style={styles.debugScrollView}
                    contentContainerStyle={styles.debugContent}
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled={true}
                  >
                    {/* Current Status */}
                    <View style={styles.debugSection}>
                      <Text style={styles.debugTitle}>🔌 Current Status:</Text>
                      <Text style={styles.debugValue}>Connection: {connectionStatus || 'idle'}</Text>
                      {connectionError && (
                        <Text style={styles.debugError}>Error: {connectionError}</Text>
                      )}
                      <Text style={styles.debugValue}>Is Connected: {(BLEManager && BLEManager.isConnected) ? '✅ Yes' : '❌ No'}</Text>
                      <Text style={styles.debugValue}>Is Scanning: {(BLEManager && BLEManager.isScanning) ? '✅ Yes' : '❌ No'}</Text>
                    </View>

                    {/* Protocol Info */}
                    {protocolInfo && (
                      <View style={styles.debugSection}>
                        <Text style={styles.debugTitle}>📡 Protocol:</Text>
                        <Text style={styles.debugValue}>Service: {protocolInfo.serviceUUID}</Text>
                        <Text style={styles.debugValue}>TX: {protocolInfo.txUUID}</Text>
                        <Text style={styles.debugValue}>RX: {protocolInfo.rxUUID}</Text>
                        <Text style={styles.debugValue}>Write: {protocolInfo.writeType}</Text>
                      </View>
                    )}

                    {/* Debug Logs History - Show ALL logs with scrollable view */}
                    <View style={styles.debugSection}>
                      <Text style={styles.debugTitle}>📋 Connection History ({debugLogs.length} total logs):</Text>
                      {debugLogs.length === 0 ? (
                        <Text style={styles.debugValue}>No connection attempts yet</Text>
                      ) : (
                        <ScrollView 
                          style={styles.debugLogsScrollView}
                          contentContainerStyle={styles.debugLogsContent}
                          showsVerticalScrollIndicator={true}
                          nestedScrollEnabled={true}
                        >
                          {debugLogs.map((log, index) => {
                            // Format timestamp for display
                            const logDate = new Date(log.timestamp);
                            const formattedTime = logDate.toLocaleString('en-IN', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                              hour12: true,
                            });
                            
                            // Get status badge color
                            const getStatusBadge = () => {
                              if (log.type === 'connected') {
                                return <Text style={styles.statusBadgeConnected}>CONNECTED</Text>;
                              } else if (log.type === 'disconnected') {
                                return <Text style={styles.statusBadgeDisconnected}>DISCONNECTED</Text>;
                              } else if (log.type === 'error') {
                                return <Text style={styles.statusBadgeError}>ERROR</Text>;
                              } else if (log.type === 'connecting') {
                                return <Text style={styles.statusBadgeConnecting}>CONNECTING</Text>;
                              }
                              return null;
                            };
                            
                            return (
                              <View key={`${log.timestamp}-${index}`} style={styles.debugLogEntry}>
                                <View style={styles.debugLogHeader}>
                                  <Text style={styles.debugLogTime}>
                                    {formattedTime}
                                  </Text>
                                  {getStatusBadge()}
                                </View>
                                <Text style={styles.debugLogMessage}>
                                  {log.message}
                                </Text>
                                
                                {/* Show disconnect reason if available */}
                                {log.data?.reason && (
                                  <Text style={styles.debugLogData}>
                                    Reason: {log.data.reason}
                                  </Text>
                                )}
                                
                                {/* Show error if available */}
                                {log.data?.error && (
                                  <Text style={styles.debugLogData}>
                                    Error: {log.data.error}
                                  </Text>
                                )}
                                
                                {/* Show device info */}
                                {(log.data?.device || log.deviceInfo) && (
                                  <Text style={styles.debugLogData}>
                                    Device: {(log.data?.device?.name || log.deviceInfo?.name || log.data?.device?.id || log.deviceInfo?.id || 'N/A')}
                                  </Text>
                                )}
                                
                                {/* Show connection state for disconnect logs */}
                                {log.type === 'disconnected' && log.data?.connectionState && (
                                  <Text style={styles.debugLogData}>
                                    Status: {log.data.connectionState.isConnected ? 'was connected' : 'was disconnected'} | 
                                    Scanning: {log.data.connectionState.isScanning ? 'Yes' : 'No'} | 
                                    Devices: {log.data.connectionState.discoveredDevices || 0}
                                  </Text>
                                )}
                                
                                {/* Show connection status for other logs */}
                                {log.type !== 'disconnected' && log.connectionStatus && (
                                  <Text style={styles.debugLogData}>
                                    Status: {log.connectionStatus} | 
                                    Scanning: {log.isScanning ? 'Yes' : 'No'} | 
                                    Devices: {log.discoveredDevices || 0}
                                  </Text>
                                )}
                              </View>
                            );
                          })}
                        </ScrollView>
                      )}
                    </View>
                  </ScrollView>
                )}
              </View>
            )}
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
  debugContainer: {
    width: '100%',
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#F9F9F9',
  },
  debugToggle: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  debugToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0097D9',
  },
  debugScrollView: {
    maxHeight: 300,
  },
  debugContent: {
    padding: 12,
  },
  debugSection: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  debugTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1D2733',
    marginBottom: 4,
  },
  debugValue: {
    fontSize: 10,
    color: '#666666',
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  debugSuccess: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  debugError: {
    color: '#F44336',
    fontWeight: '600',
  },
  debugWarning: {
    color: '#FF9800',
    fontWeight: '600',
  },
  debugLogsScrollView: {
    maxHeight: 400, // Scrollable height for logs
  },
  debugLogsContent: {
    paddingBottom: 10,
  },
  debugLogEntry: {
    marginBottom: 8,
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  debugLogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  debugLogTime: {
    fontSize: 9,
    color: '#999999',
    flex: 1,
  },
  debugLogType: {
    fontSize: 9,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#F5F5F5',
  },
  debugLogMessage: {
    fontSize: 10,
    color: '#666666',
    marginBottom: 4,
    fontWeight: '500',
  },
  debugLogData: {
    fontSize: 9,
    color: '#999999',
    fontFamily: 'monospace',
    marginTop: 2,
    lineHeight: 14,
  },
  statusBadgeConnected: {
    fontSize: 9,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    color: '#FFFFFF',
    overflow: 'hidden',
  },
  statusBadgeDisconnected: {
    fontSize: 9,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#F44336',
    color: '#FFFFFF',
    overflow: 'hidden',
  },
  statusBadgeError: {
    fontSize: 9,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#FF9800',
    color: '#FFFFFF',
    overflow: 'hidden',
  },
  statusBadgeConnecting: {
    fontSize: 9,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#2196F3',
    color: '#FFFFFF',
    overflow: 'hidden',
  },
});

export default ProfileScreen;
