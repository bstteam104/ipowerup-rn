// BLE Manager Native - Uses Kotlin Native Module (exact iOS match)
import {NativeModules, NativeEventEmitter} from 'react-native';
import {BLE_CONSTANTS} from '../constants/BLEConstants';
import {
  createPasswordCommand,
  createQueryPowerBankStatusCommand,
  createEnablePhoneChargingCommand,
  createStopChargingCommand,
  createQueryChargerConfigCommand,
} from '../utils/BLECommands';
import {parsePowerBankStatus} from '../utils/BLEParser';

const {BLEManagerNative} = NativeModules;
// CRITICAL: Check if native module is available
if (!BLEManagerNative) {
  console.error('❌ BLEManagerNative native module not found!');
}
const bleEventEmitter = BLEManagerNative ? new NativeEventEmitter(BLEManagerNative) : null;

class BLEManagerNativeService {
  constructor() {
    this.isScanning = false;
    this.isConnected = false;
    this.isConnecting = false;
    this.isAutoScanEnabled = true; // iOS default: true (line 26)
    this.hasReceivedData = false; // Track if we've received actual data (real connection verification)
    this.lastDataReceivedTime = null; // Track when last data was received
    this.discoveredDevices = []; // Only iPowerUp Uno devices
    this.allDiscoveredDevices = []; // For UI display
    this.connectedDevice = null;
    this.delegate = null;
    this.queryInterval = null; // Expose for debugging
    this.currentCommand = null;
    this.getPhoneBatteryLevel = null;
    
    // Setup event listeners
    this.setupEventListeners();
  }
  
  // Singleton instance
  static shared = new BLEManagerNativeService();
  
  setupEventListeners() {
    // CRITICAL: Check if event emitter is available
    if (!bleEventEmitter) {
      console.error('❌ BLE Event Emitter not available!');
      return;
    }
    
    // iOS: didDiscoverPeripheral() - line 184
    bleEventEmitter.addListener('onDeviceDiscovered', (device) => {
      console.log('✅ Device discovered:', device.name, device.id);
      
      // Avoid duplicates (iOS: !self.discoveredDevices.contains - line 164)
      if (!this.discoveredDevices.find(d => d.id === device.id)) {
        this.discoveredDevices.push(device);
        this.allDiscoveredDevices.push(device);
        
        // iOS: delegate?.didDiscoverPeripheral() - line 184
        if (this.delegate?.onDeviceDiscovered) {
          this.delegate.onDeviceDiscovered(device);
        }
        
        // iOS line 598-607: Auto-connect if isAutoScanEnabled == true
        // iOS: if self.manager.isAutoScanEnabled == false { NotificationCenter } else { connectToDevice }
        if (this.isAutoScanEnabled && !this.isConnected && !this.isConnecting) {
          console.log('🔄 Auto-connecting to device (iOS behavior)');
          // Auto-connect to first device found (iOS line 603-604)
          setTimeout(() => {
            if (!this.isConnected && !this.isConnecting && this.discoveredDevices.length > 0) {
              const firstDevice = this.discoveredDevices[0];
              if (firstDevice && firstDevice.id) {
                this.connectToDevice(firstDevice).catch((error) => {
                  console.error('❌ Auto-connect failed:', error);
                });
              }
            }
          }, 500); // Small delay to ensure device is ready
        }
      }
    });
    
        // iOS: didConnect(to:) - line 199
        bleEventEmitter.addListener('onConnected', (device) => {
          console.log('🎉 Connected to:', device.name);
          console.log('🔍 Actual GATT connected:', device.actualGattConnected);
          
          // CRITICAL: Only set isConnected if GATT is actually connected
          const actualGattConnected = device.actualGattConnected !== false; // Default to true if not specified
          this.isConnected = actualGattConnected;
          this.isConnecting = false;
          this.connectedDevice = device;
          // Reset data received flag - connection established but no data yet
          this.hasReceivedData = false;
          this.lastDataReceivedTime = null;
          
          if (!actualGattConnected) {
            console.error('❌ Connection reported but GATT not actually connected!');
          }
          
          if (this.delegate?.onConnected) {
            this.delegate.onConnected(device);
          }
        });
    
    // iOS: didDisconnect(from:) - line 214
    bleEventEmitter.addListener('onDisconnected', (disconnectInfo) => {
      const reason = disconnectInfo?.reason || 'Unknown reason';
      const status = disconnectInfo?.status || -1;
      const timestamp = disconnectInfo?.timestamp || new Date().toISOString();
      
      console.log('🔌 Disconnected - Reason:', reason, 'Status:', status);
      this.isConnected = false;
      this.isConnecting = false;
      
      // Store disconnect info for debug logs
      const previousDevice = this.connectedDevice;
      this.connectedDevice = null;
      
      if (this.delegate?.onDisconnected) {
        // Pass disconnect reason to delegate
        this.delegate.onDisconnected({
          reason,
          status,
          timestamp,
          device: previousDevice,
          wasConnected: disconnectInfo?.wasConnected || false,
          wasConnecting: disconnectInfo?.wasConnecting || false,
        });
      }
    });
    
    // iOS: didFailToConnect(to:) - line 207
    bleEventEmitter.addListener('onConnectionFailed', (error) => {
      console.error('❌ Connection failed:', error);
      this.isConnecting = false;
      
      if (this.delegate?.onConnectionFailed) {
        this.delegate.onConnectionFailed(error);
      }
    });
    
    // iOS: didReceiveData(_:commandSent:) - line 335
    bleEventEmitter.addListener('onDataReceived', (data) => {
      const rawDataStr = data.data || '';
      const dataLength = data.dataLength || 0;
      console.log('📥 BLEManagerNative: Received raw data from device');
      console.log('📥 Data hex string:', rawDataStr);
      console.log('📥 Data type:', typeof rawDataStr);
      console.log('📥 Data length (hex chars):', rawDataStr?.length, '| Native bytes:', dataLength);
      console.log('📥 Characteristic UUID:', data.characteristicUuid);
      console.log('📥 Current command (expected):', this.currentCommand);
      
      // CRITICAL: Log if data is empty or invalid
      if (!rawDataStr || rawDataStr.length === 0) {
        console.error('❌ Received empty data from device!');
        console.error('❌ Data object:', JSON.stringify(data, null, 2));
        if (this.delegate?.onDataParseError) {
          this.delegate.onDataParseError('Empty data received from device');
        }
        return;
      }
      
      // ALWAYS log raw hex data to UI first (before parsing)
      if (this.delegate?.onRawDataReceived) {
        this.delegate.onRawDataReceived(rawDataStr);
      }
      
      // Parse data if it's hex string (iOS sends hex string)
      if (this.delegate?.onDataReceived) {
        // Check if data is hex string or parsed object
        if (typeof rawDataStr === 'string' && rawDataStr.length > 0) {
          // It's hex string - parse it for React Native UI
          try {
            // Convert hex string to Uint8Array (React Native compatible, no Buffer needed)
            let hex = rawDataStr.replace(/0x/gi, '').replace(/\s/g, '');
            // Ensure even length (pad with 0 if odd)
            if (hex.length % 2 !== 0) {
              hex = '0' + hex;
            }
            const buffer = new Uint8Array(hex.length / 2);
            for (let i = 0; i < hex.length; i += 2) {
              buffer[i / 2] = parseInt(hex.substring(i, i + 2), 16);
            }
            console.log('📥 Parsed buffer length:', buffer.length, 'bytes');
            
            // iOS: Parse based on first byte (command) instead of currentCommand
            // This is more reliable as data might arrive after currentCommand is cleared
            if (buffer.length > 0) {
              const commandByte = buffer[0];
              const commandHex = '0x' + commandByte.toString(16).padStart(2, '0').toUpperCase();
              console.log('📥 Device response command byte:', commandHex);
              
              // Log all responses with command byte info
              if (this.delegate?.onDeviceResponse) {
                this.delegate.onDeviceResponse(commandHex, rawDataStr, buffer.length);
              }
              
              // Check if it's Power Bank Status response (0x04)
              if (commandByte === BLE_CONSTANTS.COMMAND_QUERY_POWER_BANK_STATUS) {
                console.log('✅ Detected Power Bank Status response (0x04)');
                const parsed = parsePowerBankStatus(buffer);
                if (parsed) {
                  // Mark that we've received real data (connection verified)
                  this.hasReceivedData = true;
                  this.lastDataReceivedTime = Date.now();
                  console.log('✅ Parsed Power Bank Status:', parsed);
                  console.log('✅ Connection verified: Real data received from device');
                  this.delegate.onDataReceived(parsed);
                } else {
                  console.error('❌ Failed to parse Power Bank Status - but raw data logged above');
                  // Log parsing error to UI with raw data
                  if (this.delegate?.onDataParseError) {
                    this.delegate.onDataParseError(`Parse failed for 0x04. Raw: ${rawDataStr.substring(0, 40)}...`);
                  }
                }
              } else if (commandByte === BLE_CONSTANTS.COMMAND_QUERY_CHARGER_CONFIG) {
                console.log('✅ Detected Charger Config response (0x03)');
                // Parse charger config - Protocol PDF: byte 5 (index 5) = EnPhCharger (0=off, 1=on)
                // iOS: bytes[5] == 1 for enPhCharger
                if (buffer.length >= 6) {
                  const enPhCharger = buffer[5] === 1;
                  console.log('📊 Charger Config - enPhCharger:', enPhCharger);
                  if (this.delegate?.onChargerConfigReceived) {
                    this.delegate.onChargerConfigReceived({enPhCharger});
                  }
                } else {
                  console.error('❌ Charger config response too short:', buffer.length);
                }
              } else if (commandByte === BLE_CONSTANTS.COMMAND_SEND_PASSWORD) {
                // Device is acknowledging password (0x19 response) - this is normal
                console.log('✅ Device acknowledged password (0x19 response)');
                if (this.delegate?.onDeviceResponse) {
                  this.delegate.onDeviceResponse('0x19 (PASSWORD_ACK)', rawDataStr, buffer.length);
                }
                // Password acknowledged - device is ready
                // iOS doesn't wait for password ACK before sending 0x04, but we log it for debugging
                // The actual data will come from queryPowerBankStatus (0x04) response
                this.hasReceivedData = true; // Mark that we've received some response
              } else if (commandByte === BLE_CONSTANTS.COMMAND_ENABLE_PHONE_CHARGING) {
                // iOS: enablePhoneCharging response (0x21) - just debugPrint, no UI update
                // iOS line 287-290: case .enablePhoneCharging: debugPrint(data)
                console.log('✅ Device acknowledged ENABLE_PHONE_CHARGING (0x21 response)');
                console.log('📝 iOS pattern: Ignoring 0x21 response - status will come from PowerBankStatus (0x04)');
                if (this.delegate?.onDeviceResponse) {
                  this.delegate.onDeviceResponse('0x21 (ENABLE_CHARGING_ACK)', rawDataStr, buffer.length);
                }
                // Don't update UI from command response - wait for PowerBankStatus query
                // iOS relies on periodic query to update charging status
              } else if (commandByte === BLE_CONSTANTS.COMMAND_STOP_CHARGING) {
                // iOS: stopCharging response (0x18) - just debugPrint, no UI update
                // iOS line 291-294: case .stopCharging: debugPrint(data)
                console.log('✅ Device acknowledged STOP_CHARGING (0x18 response)');
                console.log('📝 iOS pattern: Ignoring 0x18 response - status will come from PowerBankStatus (0x04)');
                if (this.delegate?.onDeviceResponse) {
                  this.delegate.onDeviceResponse('0x18 (STOP_CHARGING_ACK)', rawDataStr, buffer.length);
                }
                // Don't update UI from command response - wait for PowerBankStatus query
                // iOS relies on periodic query to update charging status
              } else {
                // For other/unknown commands, log them
                console.log('⚠️ Unknown/unexpected command byte:', commandHex);
                if (this.delegate?.onDeviceResponse) {
                  this.delegate.onDeviceResponse(commandHex + ' (UNKNOWN)', rawDataStr, buffer.length);
                }
                // Don't call onDataReceived for unknown commands - they're not PowerBankStatus
              }
            } else {
              console.error('❌ Empty buffer received - no data from device');
              if (this.delegate?.onDataParseError) {
                this.delegate.onDataParseError('Empty buffer - device sent no data');
              }
            }
          } catch (parseError) {
            console.error('❌ Error parsing data:', parseError);
            console.error('❌ Raw data (device sent this):', rawDataStr);
            // Log parse error to UI with full raw data
            if (this.delegate?.onDataParseError) {
              this.delegate.onDataParseError(`Parse error: ${parseError.message}. Raw: ${rawDataStr}`);
            }
            // Fallback: send raw data
            this.delegate.onDataReceived(rawDataStr, this.currentCommand);
          }
        } else {
          // Already parsed or other format
          console.log('⚠️ Data is not a string, sending as-is');
          console.log('⚠️ Received data:', typeof rawDataStr, rawDataStr);
          this.delegate.onDataReceived(rawDataStr, this.currentCommand);
        }
      } else {
        console.warn('⚠️ No delegate.onDataReceived callback set');
      }
    });
    
    // iOS: didStartScanning() - line 69
    bleEventEmitter.addListener('onScanStarted', () => {
      console.log('🔍 Scan started');
      this.isScanning = true;
      
      if (this.delegate?.onScanStarted) {
        this.delegate.onScanStarted();
      }
      // Alias for compatibility
      if (this.delegate?.onStartScanning) {
        this.delegate.onStartScanning();
      }
    });
    
    // iOS: didStopScanning() - line 76
    bleEventEmitter.addListener('onScanStopped', () => {
      console.log('⏹️ Scan stopped');
      this.isScanning = false;
      
      if (this.delegate?.onScanStopped) {
        this.delegate.onScanStopped();
      }
      // Alias for compatibility
      if (this.delegate?.onStopScanning) {
        this.delegate.onStopScanning();
      }
    });
    
    // Bluetooth state change
    bleEventEmitter.addListener('onBluetoothStateChange', (state) => {
      console.log('📶 Bluetooth state changed:', state);
      
      if (this.delegate?.onBluetoothStateChange) {
        this.delegate.onBluetoothStateChange(state);
      }
    });
    
    // Scan error
    bleEventEmitter.addListener('onScanError', (error) => {
      console.error('❌ Scan error:', error);
      
      if (this.delegate?.onScanError) {
        this.delegate.onScanError(error);
      }
    });
    
    // Permission error
    bleEventEmitter.addListener('onPermissionError', (error) => {
      console.error('❌ Permission error:', error);
      
      if (this.delegate?.onPermissionError) {
        this.delegate.onPermissionError(error);
      }
    });
    
    // Update all discovered devices list (for UI)
    // This is called whenever a device is discovered
    bleEventEmitter.addListener('onDeviceDiscovered', (device) => {
      // Also trigger onAnyDeviceDiscovered with updated list
      if (this.delegate?.onAnyDeviceDiscovered) {
        this.delegate.onAnyDeviceDiscovered([...this.allDiscoveredDevices]);
      }
    });
    
    // Notification enabled event (from Android native)
    bleEventEmitter.addListener('onNotificationEnabled', (data) => {
      console.log('📡 Notification enabled status:', data.status);
      if (data.status === 'success') {
        this.notificationEnabled = true;
        console.log('✅ Notifications enabled - ready to receive data from device');
        // Notify delegate if callback exists
        if (this.delegate?.onNotificationEnabled) {
          this.delegate.onNotificationEnabled(true);
        }
      } else {
        this.notificationEnabled = false;
        console.error('❌ Failed to enable notifications, error code:', data.errorCode);
        if (this.delegate?.onNotificationEnabled) {
          this.delegate.onNotificationEnabled(false);
        }
      }
    });
    
    // Log raw data to UI for debugging
    bleEventEmitter.addListener('onRawDataReceived', (data) => {
      console.log('📥 Raw data event received:', data);
      if (this.delegate?.onRawDataReceived) {
        this.delegate.onRawDataReceived(data.data || data);
      }
    });
  }
  
  // iOS: startScanning() - line 66
  async startScanning() {
    try {
      if (this.isScanning) {
        console.log('⚠️ Already scanning');
        return;
      }
      
      // Clear previous devices
      this.discoveredDevices = [];
      this.allDiscoveredDevices = [];
      
      // iOS: centralManager.scanForPeripherals(withServices: nil, options: nil) - line 68
      await BLEManagerNative.startScanning();
      this.isScanning = true;
    } catch (error) {
      console.error('❌ Error starting scan:', error);
      throw error;
    }
  }
  
  // iOS: stopScanning() - line 73
  async stopScanning() {
    try {
      if (!this.isScanning) {
        return;
      }
      
      // iOS: centralManager.stopScan() - line 75
      await BLEManagerNative.stopScanning();
      this.isScanning = false;
    } catch (error) {
      console.error('❌ Error stopping scan:', error);
      throw error;
    }
  }
  
  // iOS: connectToDevice(_:) - line 114
  async connectToDevice(device) {
    try {
      if (this.isConnecting || this.isConnected) {
        console.log('⚠️ Already connecting or connected');
        return;
      }
      
      if (!device || !device.id) {
        throw new Error('Invalid device');
      }
      
      this.isConnecting = true;
      
      // iOS: centralManager.connect(peripheral, options: options) - line 128
      // iOS line 118-125: Connection options for stability
      // Password timer is handled in native (1 second after connection initiated)
      await BLEManagerNative.connectToDevice(device.id);
      
      // iOS doesn't wait for connection - it's async
      // Connection state will be updated via onConnected event
    } catch (error) {
      this.isConnecting = false;
      console.error('❌ Error connecting:', error);
      throw error;
    }
  }
  
  // iOS: connectToDevice(_:) - but by device ID
  async connectToDeviceById(deviceId) {
    try {
      const device = this.discoveredDevices.find(d => d.id === deviceId);
      if (!device) {
        throw new Error('Device not found');
      }
      
      await this.connectToDevice(device);
    } catch (error) {
      console.error('❌ Error connecting by ID:', error);
      throw error;
    }
  }
  
  // iOS: disconnectDevice() - line 80
  async disconnectDevice() {
    try {
      await BLEManagerNative.disconnectDevice();
      this.isConnected = false;
      this.isConnecting = false;
      this.connectedDevice = null;
    } catch (error) {
      console.error('❌ Error disconnecting:', error);
      throw error;
    }
  }
  
  // iOS: sendCommand(_:value:) - line 91
  async sendCommand(commandType, value = 0) {
    try {
      if (!this.isConnected) {
        throw new Error('Not connected');
      }
      
      // iOS: peripheral.writeValue(data, for: writeCharacters, type: .withoutResponse) - line 104
      await BLEManagerNative.sendCommand(commandType, value);
      this.currentCommand = commandType;
    } catch (error) {
      console.error('❌ Error sending command:', error);
      throw error;
    }
  }
  
  // iOS: sendCommand(.sendPassword) - line 131
  async sendPassword() {
    await this.sendCommand(BLE_CONSTANTS.COMMAND_SEND_PASSWORD);
  }
  
  // iOS: sendCommand(.queryPowerBankStatus) - with phone battery
  async queryPowerBankStatus() {
    // Get phone battery level (handle both sync and async getters)
    let phoneBattery = 50; // Default fallback
    if (this.getPhoneBatteryLevel) {
      try {
        const result = this.getPhoneBatteryLevel();
        // Handle both Promise and direct value
        phoneBattery = result instanceof Promise ? await result : result;
        phoneBattery = Math.round(phoneBattery); // Ensure integer
        phoneBattery = Math.max(0, Math.min(100, phoneBattery)); // Clamp to 0-100
      } catch (error) {
        console.warn('⚠️ Failed to get phone battery, using default:', error);
        phoneBattery = 50;
      }
    }
    console.log('📱 Querying power bank status with phone battery:', phoneBattery + '%');
    // Command format: 0x04 + phone battery % (2 bytes little-endian at position 7-8)
    await this.sendCommand(BLE_CONSTANTS.COMMAND_QUERY_POWER_BANK_STATUS, phoneBattery);
  }
  
  // iOS: sendCommand(.enablePhoneCharging) - line 166
  // iOS: Just sends command, no immediate query (periodic query will handle updates)
  async enablePhoneCharging() {
    console.log('⚡ Sending ENABLE_PHONE_CHARGING command (0x21)...');
    console.log('⚠️ IMPORTANT: Make sure phone is connected to case via USB cable for charging to work');
    await this.sendCommand(BLE_CONSTANTS.COMMAND_ENABLE_PHONE_CHARGING);
    console.log('✅ ENABLE_PHONE_CHARGING command sent successfully');
    
    // iOS: No immediate query after command - periodic query (every 5 seconds) will update status
    // iOS line 287-290: Just debugPrint, no query
  }
  
  // iOS: sendCommand(.stopCharging) - line 163
  // iOS: Just sends command, no immediate query (periodic query will handle updates)
  async stopCharging() {
    console.log('🛑 Sending STOP_CHARGING command (0x18)...');
    await this.sendCommand(BLE_CONSTANTS.COMMAND_STOP_CHARGING);
    console.log('✅ STOP_CHARGING command sent successfully');
    
    // iOS: No immediate query after command - periodic query (every 5 seconds) will update status
    // iOS line 291-294: Just debugPrint, no query
  }
  
  // iOS: sendCommand(.queryChargerConfigStatus)
  async queryChargerConfigStatus() {
    console.log('📊 Sending QUERY_CHARGER_CONFIG_STATUS command (0x03)...');
    await this.sendCommand(BLE_CONSTANTS.COMMAND_QUERY_CHARGER_CONFIG);
    console.log('✅ QUERY_CHARGER_CONFIG_STATUS command sent successfully');
  }
  
  // Get discovered devices (iOS: discoveredDevices - line 34)
  getDiscoveredDevices() {
    return this.allDiscoveredDevices;
  }
  
  // iOS: getAllDiscoveredDevices() - alias for compatibility
  getAllDiscoveredDevices() {
    return this.allDiscoveredDevices;
  }
  
  // Clear discovered devices
  clearAllDiscoveredDevices() {
    this.discoveredDevices = [];
    this.allDiscoveredDevices = [];
  }
  
      // Get connected device info
      getConnectedDeviceInfo() {
        if (!this.isConnected || !this.connectedDevice) {
          return null;
        }
        
        return {
          id: this.connectedDevice.id,
          name: this.connectedDevice.name || 'Unknown Device',
          address: this.connectedDevice.address || this.connectedDevice.id,
        };
      }
      
      // Check if device is REALLY connected (has received data)
      // iOS: isConnected is set in didConnect, but real verification is when data is received
      isReallyConnected() {
        return this.isConnected && this.hasReceivedData;
      }
      
      // Get connection status details
      getConnectionStatus() {
        return {
          isConnected: this.isConnected,
          hasReceivedData: this.hasReceivedData,
          isReallyConnected: this.isReallyConnected(),
          lastDataReceivedTime: this.lastDataReceivedTime,
          connectedDevice: this.connectedDevice,
        };
      }
  
  // Set delegate (iOS: weak var delegate - line 21)
  setDelegate(delegate) {
    this.delegate = delegate;
  }
  
  // Set phone battery getter (for queryPowerBankStatus)
  setPhoneBatteryGetter(getter) {
    this.getPhoneBatteryLevel = getter;
  }
  
  // Get Bluetooth state
  async getBluetoothState() {
    try {
      // Native module should provide this
      if (BLEManagerNative.getBluetoothState) {
        return await BLEManagerNative.getBluetoothState();
      }
      // Fallback
      return 'Unknown';
    } catch (error) {
      console.error('Error getting Bluetooth state:', error);
      return 'Unknown';
    }
  }
  
  // Start periodic query (iOS pattern) - alias for compatibility
  startPeriodicQueries() {
    this.startPeriodicQuery();
  }
  
  // Start periodic query (iOS pattern)
  startPeriodicQuery() {
    // CRITICAL: Always clear existing interval first to prevent duplicates
    if (this.queryInterval) {
      console.log('🛑 Stopping existing periodic query before starting new one');
      clearInterval(this.queryInterval);
      this.queryInterval = null;
    }
    
    console.log('🔄 Starting periodic query (every', BLE_CONSTANTS.QUERY_INTERVAL / 1000, 'seconds)');
    
    // Query every 5 seconds (iOS pattern)
    // Add error handling to prevent silent failures
    this.queryInterval = setInterval(() => {
      if (this.isConnected) {
        console.log('⏰ Periodic query tick - sending queryPowerBankStatus...');
        this.queryPowerBankStatus().catch((error) => {
          console.error('❌ Periodic query failed:', error);
          // Don't stop interval on single failure - keep retrying
          // This handles intermittent connection issues
        });
      } else {
        console.warn('⚠️ Periodic query tick but not connected - skipping');
      }
    }, BLE_CONSTANTS.QUERY_INTERVAL);
    
    // Verify interval was created
    if (this.queryInterval) {
      console.log('✅ Periodic query interval created successfully');
    } else {
      console.error('❌ Failed to create periodic query interval!');
    }
  }
  
  // Stop periodic query - alias for compatibility
  stopPeriodicQueries() {
    this.stopPeriodicQuery();
  }
  
  // Stop periodic query
  stopPeriodicQuery() {
    if (this.queryInterval) {
      clearInterval(this.queryInterval);
      this.queryInterval = null;
    }
  }
}

export default BLEManagerNativeService.shared;

