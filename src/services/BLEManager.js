// BLE Manager - Singleton pattern
import {BleManager} from 'react-native-ble-plx';
import {BLE_CONSTANTS} from '../constants/BLEConstants';
import {
  createPasswordCommand,
  createQueryPowerBankStatusCommand,
  createEnablePhoneChargingCommand,
  createStopChargingCommand,
} from '../utils/BLECommands';
import {parsePowerBankStatus} from '../utils/BLEParser';

class BLEManagerService {
  constructor() {
    this.manager = new BleManager();
    this.isScanning = false;
    this.isConnected = false;
    this.isAutoScanEnabled = true;
    this.discoveredDevices = []; // Only iPowerUp Uno devices
    this.allDiscoveredDevices = []; // Only iPowerUp Uno devices for UI
    this.connectedDevice = null;
    this.writeCharacteristic = null;
    this.notifyCharacteristic = null;
    this.delegate = null;
    this.queryInterval = null;
    this.currentCommand = null;
    
    // Phone battery getter (will be set from outside)
    this.getPhoneBatteryLevel = null;
    
    // Initialize
    this.initialize();
  }
  
  // Singleton instance
  static shared = new BLEManagerService();
  
  initialize() {
    // Monitor Bluetooth state
    this.manager.onStateChange((state) => {
      console.log('Bluetooth state:', state);
      if (state === 'PoweredOn') {
        console.log('✅ Bluetooth is ON');
        if (this.delegate?.onBluetoothStateChange) {
          this.delegate.onBluetoothStateChange('PoweredOn');
        }
      } else if (state === 'PoweredOff') {
        console.log('❌ Bluetooth is OFF');
        if (this.delegate?.onBluetoothStateChange) {
          this.delegate.onBluetoothStateChange('PoweredOff');
        }
      }
    });
  }
  
  // Check current Bluetooth state
  async getBluetoothState() {
    try {
      const state = await this.manager.state();
      return state;
    } catch (error) {
      console.error('Error getting Bluetooth state:', error);
      return null;
    }
  }
  
  // Set delegate
  setDelegate(delegate) {
    this.delegate = delegate;
  }
  
  // Set phone battery getter
  setPhoneBatteryGetter(getter) {
    this.getPhoneBatteryLevel = getter;
  }
  
  // Start scanning
  startScanning() {
    if (this.isScanning || this.isConnected) {
      console.log('⚠️ Already scanning or connected, skipping...');
      return;
    }
    
    console.log('🔍 Starting BLE scan for ALL devices...');
    this.isScanning = true;
    // Clear previous devices when starting new scan
    this.allDiscoveredDevices = [];
    
    // Scan options - allow duplicate keys to get updated device info (including names)
    // Note: allowDuplicates helps get device names that come in scan response packets
    const scanOptions = {
      allowDuplicates: true, // Allow duplicate keys to get name updates (names often come in later callbacks)
    };
    
    this.manager.startDeviceScan(
      null, // No service filter - scan all devices
      scanOptions, // Scan options to get device names
      (error, device) => {
        if (error) {
          console.error('Scan error:', error);
          this.isScanning = false;
          
          // Handle permission errors
          if (error.message && error.message.includes('not authorized')) {
            if (this.delegate?.onPermissionError) {
              this.delegate.onPermissionError(error);
            }
          } else if (this.delegate?.onScanError) {
            this.delegate.onScanError(error);
          }
          return;
        }
        
        if (!device) return;
        
        // Only accept devices with exact name "iPowerUp Uno"
        // Get device name - check multiple sources (name might come in later callbacks)
        // Priority: name > localName > advertising.completeLocalName > advertising.localName
        let deviceName = device.name || device.localName || null;
        
        // Check advertising data for name (some devices put name in advertising data)
        if (!deviceName && device.advertising) {
          // Check completeLocalName first (BLE standard field)
          if (device.advertising.completeLocalName) {
            deviceName = device.advertising.completeLocalName;
          } else if (device.advertising.localName) {
            deviceName = device.advertising.localName;
          } else if (device.advertising.shortenedLocalName) {
            deviceName = device.advertising.shortenedLocalName;
          }
        }
        
        // Only accept exact match "iPowerUp Uno"
        if (!deviceName || deviceName !== BLE_CONSTANTS.DEVICE_NAME) {
          return; 
        }
        
        console.log('✅ Peripheral is Discover:', deviceName);
        
        // Avoid duplicates
        const deviceId = device.id;
        const existingIndex = this.allDiscoveredDevices.findIndex(d => d.id === deviceId);
        
        if (existingIndex === -1) {
          // New iPowerUp device - Add to devices list
          this.allDiscoveredDevices.push({
            id: deviceId,
            name: deviceName,
            rssi: device.rssi,
            timestamp: Date.now(),
          });
          
          console.log('✅ Discovered: ' + deviceName + ' (' + deviceId + ')');
        } else {
          // Update existing device (RSSI might change)
          this.allDiscoveredDevices[existingIndex].rssi = device.rssi;
          this.allDiscoveredDevices[existingIndex].timestamp = Date.now();
        }
        
        // Notify delegate about updated iPowerUp device list (for real-time UI update)
        if (this.delegate?.onAnyDeviceDiscovered) {
          console.log('📡 Notifying delegate with', this.allDiscoveredDevices.length, 'iPowerUp devices');
          this.delegate.onAnyDeviceDiscovered([...this.allDiscoveredDevices]);
        }
        
        // Add to discoveredDevices array
        if (!this.discoveredDevices.find(d => d.id === device.id)) {
          this.discoveredDevices.push(device);
          
          if (this.delegate?.onDeviceDiscovered) {
            this.delegate.onDeviceDiscovered(device);
          }
          
          // Auto-connect if enabled
          if (this.isAutoScanEnabled) {
            this.stopScanning();
            this.connectToDevice(device);
          }
        }
      }
    );
    
    if (this.delegate?.onStartScanning) {
      this.delegate.onStartScanning();
    }
  }
  
  // Stop scanning
  stopScanning() {
    if (this.isScanning) {
      this.manager.stopDeviceScan();
      this.isScanning = false;
      console.log('🛑 Stopped scanning');
      
      if (this.delegate?.onStopScanning) {
        this.delegate.onStopScanning();
      }
    }
  }
  
  // Get all discovered devices (for UI)
  getAllDiscoveredDevices() {
    return this.allDiscoveredDevices;
  }
  
  // Clear all discovered devices
  clearAllDiscoveredDevices() {
    this.allDiscoveredDevices = [];
  }
  
  // Connect to device
  async connectToDevice(device) {
    try {
      console.log('🔌 Connecting to:', device.name);
      this.stopScanning();
      
      this.connectedDevice = device;
      
      // Connect
      const connectedDevice = await device.connect();
      console.log('✅ Connected to:', connectedDevice.name);
      
      this.isConnected = true;
      
      if (this.delegate?.onConnected) {
        this.delegate.onConnected(connectedDevice);
      }
      
      // Discover services
      await this.discoverServices(connectedDevice);
      
    } catch (error) {
      console.error('❌ Connection failed:', error);
      this.isConnected = false;
      this.connectedDevice = null;
      
      if (this.delegate?.onConnectionFailed) {
        this.delegate.onConnectionFailed(error);
      }
    }
  }
  
  // Discover services and characteristics
  async discoverServices(device) {
    try {
      // Discover services
      const deviceWithServices = await device.discoverAllServicesAndCharacteristics();
      console.log('✅ Discovered services');
      
      // Find our service
      const service = deviceWithServices.services().find(
        s => s.uuid.toLowerCase() === BLE_CONSTANTS.SERVICE_UUID.toLowerCase()
      );
      
      if (!service) {
        throw new Error('Service not found');
      }
      
      console.log('✅ Found service:', service.uuid);
      
      // Find characteristics
      const characteristics = service.characteristics();
      
      for (const char of characteristics) {
        const charUUID = char.uuid.toLowerCase();
        console.log('Found characteristic:', charUUID);
        
        // TX characteristic (Phone → Case) - for writing
        if (charUUID === BLE_CONSTANTS.TX_CHARACTERISTIC_UUID.toLowerCase()) {
          this.writeCharacteristic = char;
          console.log('✍️ Write characteristic found');
        }
        
        // RX characteristic (Case → Phone) - for notifications
        if (charUUID === BLE_CONSTANTS.RX_CHARACTERISTIC_UUID.toLowerCase()) {
          this.notifyCharacteristic = char;
          console.log('📡 Notify characteristic found');
          
          // Subscribe to notifications
          char.monitor((error, characteristic) => {
            if (error) {
              console.error('Notification error:', error);
              return;
            }
            
            if (characteristic?.value) {
              this.handleNotification(characteristic.value);
            }
          });
          
          console.log('✅ Subscribed to notifications');
        }
      }
      
      // Wait 1 second then send password
      setTimeout(() => {
        this.sendPassword();
      }, BLE_CONSTANTS.CONNECTION_DELAY);
      
    } catch (error) {
      console.error('❌ Service discovery failed:', error);
    }
  }
  
  // Handle notification (Case → Phone)
  handleNotification(base64Value) {
    try {
      // Convert base64 to buffer
      const buffer = Buffer.from(base64Value, 'base64');
      
      console.log('📥 Received data:', buffer.toString('hex'));
      
      // Parse response
      if (this.currentCommand === 'queryPowerBankStatus') {
        const parsed = parsePowerBankStatus(
          buffer,
          this.delegate?.getTemperatureUnit?.() || 'celsius'
        );
        
        if (parsed && this.delegate?.onDataReceived) {
          this.delegate.onDataReceived(parsed);
        }
      }
      
    } catch (error) {
      console.error('Error handling notification:', error);
    }
  }
  
  // Send password command
  sendPassword() {
    if (!this.writeCharacteristic || !this.connectedDevice) {
      console.error('Cannot send password: not connected');
      return;
    }
    
    const command = createPasswordCommand();
    this.currentCommand = 'sendPassword';
    
    const base64Command = command.toString('base64');
    
    this.writeCharacteristic
      .writeWithResponse(base64Command)
      .then(() => {
        console.log('✅ Password sent');
        
        // After password, query status
        setTimeout(() => {
          this.queryPowerBankStatus();
        }, 500);
      })
      .catch(error => {
        console.error('❌ Failed to send password:', error);
      });
  }
  
  // Query power bank status
  async queryPowerBankStatus() {
    if (!this.writeCharacteristic || !this.connectedDevice) {
      return;
    }
    
    // Get phone battery from getter
    let phoneBattery = 0;
    if (this.getPhoneBatteryLevel) {
      phoneBattery = await this.getPhoneBatteryLevel();
    }
    
    const command = createQueryPowerBankStatusCommand(phoneBattery);
    this.currentCommand = 'queryPowerBankStatus';
    
    const base64Command = command.toString('base64');
    
    try {
      await this.writeCharacteristic.writeWithResponse(base64Command);
      console.log('✅ Query status sent (phone battery:', phoneBattery, '%)');
    } catch (error) {
      console.error('❌ Failed to query status:', error);
    }
  }
  
  // Start periodic queries
  startPeriodicQueries() {
    if (this.queryInterval) {
      clearInterval(this.queryInterval);
    }
    
    this.queryInterval = setInterval(() => {
      if (this.isConnected) {
        this.queryPowerBankStatus();
      }
    }, BLE_CONSTANTS.QUERY_INTERVAL);
  }
  
  // Stop periodic queries
  stopPeriodicQueries() {
    if (this.queryInterval) {
      clearInterval(this.queryInterval);
      this.queryInterval = null;
    }
  }
  
  // Enable phone charging
  async enablePhoneCharging() {
    if (!this.writeCharacteristic || !this.connectedDevice) {
      console.error('Cannot enable charging: not connected');
      return;
    }
    
    const command = createEnablePhoneChargingCommand();
    this.currentCommand = 'enablePhoneCharging';
    
    const base64Command = command.toString('base64');
    
    try {
      await this.writeCharacteristic.writeWithResponse(base64Command);
      console.log('✅ Enable charging command sent');
      
      // Query status after 2.5 seconds
      setTimeout(() => {
        this.queryPowerBankStatus();
      }, 2500);
    } catch (error) {
      console.error('❌ Failed to enable charging:', error);
    }
  }
  
  // Stop charging
  async stopCharging() {
    if (!this.writeCharacteristic || !this.connectedDevice) {
      console.error('Cannot stop charging: not connected');
      return;
    }
    
    const command = createStopChargingCommand();
    this.currentCommand = 'stopCharging';
    
    const base64Command = command.toString('base64');
    
    try {
      await this.writeCharacteristic.writeWithResponse(base64Command);
      console.log('✅ Stop charging command sent');
      
      // Query status after 2.5 seconds
      setTimeout(() => {
        this.queryPowerBankStatus();
      }, 2500);
    } catch (error) {
      console.error('❌ Failed to stop charging:', error);
    }
  }
  
  // Disconnect device
  async disconnectDevice() {
    if (this.connectedDevice) {
      try {
        await this.connectedDevice.cancelConnection();
        console.log('🔌 Disconnected');
      } catch (error) {
        console.error('Disconnect error:', error);
      }
    }
    
    this.isConnected = false;
    this.connectedDevice = null;
    this.writeCharacteristic = null;
    this.notifyCharacteristic = null;
    this.discoveredDevices = [];
    this.stopPeriodicQueries();
    
    if (this.delegate?.onDisconnected) {
      this.delegate.onDisconnected();
    }
  }
  
  // Cleanup
  destroy() {
    this.stopScanning();
    this.stopPeriodicQueries();
    this.disconnectDevice();
    this.manager.destroy();
  }
}

export default BLEManagerService.shared;

