# iPowerUp React Native App - Technical Summary

## 📱 Overview
React Native app jo Bluetooth Low Energy (BLE) ke through iPowerUp Uno device se connect hota hai aur real-time battery/temperature data receive karta hai.

---

## 🔵 Bluetooth Implementation

### **Main Library Used:**
- **`react-native-ble-plx`** (Version 3.5.0)
  - Industry-standard BLE library for React Native
  - Cross-platform (Android + iOS)
  - GitHub: https://github.com/dotintent/react-native-ble-plx
  - Used for: Device scanning, connection, data communication

### **How Bluetooth Works:**

#### 1. **Device Scanning**
- App automatically scans for "iPowerUp Uno" devices
- Only shows devices with exact name match
- Uses BLE advertising packets to discover devices

#### 2. **Connection Process**
```
Scan → Find "iPowerUp Uno" → Connect → Discover Services → 
Subscribe to Notifications → Send Password → Query Status
```

#### 3. **Data Communication**
- **Service UUID**: `000056ff-0000-1000-8000-00805f9b34fb`
- **TX Characteristic** (Phone → Case): `000033f3-0000-1000-8000-00805f9b34fb`
- **RX Characteristic** (Case → Phone): `000033F4-0000-1000-8000-00805f9b34fb`

#### 4. **Commands Sent to Device**
- **Password Command** (0x19): Authentication
- **Query Power Bank Status** (0x04): Get battery, temperature, charging status
- **Enable Phone Charging** (0x21): Start charging phone from case
- **Stop Charging** (0x18): Stop charging

#### 5. **Data Received from Device**
Device se HEX format mein data aata hai:
- Case Battery % (Byte 3)
- Case Temperature (Byte 5)
- Phone Charging Status (Byte 4, Flag 0x04)
- Solar Current (Byte 6)
- Phone Battery % (Byte 7) - but hum phone se directly lete hain

### **Native Android Module:**
- **Custom `BluetoothModule.kt`** (Kotlin)
  - Bluetooth enable/disable check karta hai
  - Android system dialog show karta hai Bluetooth enable ke liye
  - Location: `android/app/src/main/java/com/ipowerupreactnative/BluetoothModule.kt`

### **Permissions Required:**
- **Android 12+**: `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`, `ACCESS_FINE_LOCATION`
- **Android 11-**: `ACCESS_FINE_LOCATION`
- **iOS**: Automatically handled via Info.plist

---

## 🔋 Mobile Battery Implementation

### **Main Library Used:**
- **`react-native-device-info`** (Version 15.0.1)
  - Popular library for device information
  - GitHub: https://github.com/react-native-device-info/react-native-device-info
  - Used for: Phone battery level retrieval

### **How Battery is Retrieved:**

#### 1. **Battery Level Method**
```javascript
const getPhoneBatteryLevel = async () => {
  const level = await DeviceInfo.getBatteryLevel();
  const percent = Math.round(level * 100);
  return percent; // Returns 0-100
}
```

#### 2. **How it Works:**
- **Android**: Uses `BatteryManager` API through native bridge
- **iOS**: Uses `UIDevice.batteryLevel` through native bridge
- Returns value between 0.0 to 1.0 (converted to 0-100%)

#### 3. **Update Frequency:**
- Every 5 seconds (polling method)
- React Native doesn't have battery change listener, so we poll

#### 4. **Why Phone Battery from Phone (not Case)?**
- Case se phone battery bhi aata hai (Byte 7), but:
- Phone se direct lete hain kyunki:
  - More accurate
  - Real-time updates
  - No dependency on BLE connection

---

## 📦 Key Dependencies

### **Core Libraries:**
1. **react-native-ble-plx** (^3.5.0)
   - Bluetooth Low Energy communication

2. **react-native-device-info** (^15.0.1)
   - Device information (battery, model, etc.)

3. **@react-native-async-storage/async-storage** (^2.2.0)
   - Local data storage (history, user data)

4. **@react-navigation/native** (^7.1.21)
   - Navigation between screens

### **Platform-Specific:**
- **Android**: Custom Kotlin module for Bluetooth enable/disable
- **iOS**: Uses native CoreBluetooth framework (via react-native-ble-plx)

---

## 🔄 Data Flow

### **1. App Start:**
```
App Launch → Check Permissions → Request if needed → 
Enable Bluetooth → Start Scanning → Find Device → Connect
```

### **2. Real-time Data:**
```
Connected → Send Password → Query Status → Receive HEX Data → 
Parse Data → Update UI (Battery %, Temperature, Charging Status)
```

### **3. Periodic Updates:**
- Every 5 seconds: Query power bank status
- Every 5 seconds: Get phone battery level
- Real-time: Receive notifications from case

---

## 🛠️ Technical Architecture

### **Singleton Pattern:**
- `BLEManagerService` - Single instance for BLE operations
- iOS `BLEManager.swift` jaisa structure

### **Delegate Pattern:**
- iOS-style delegate callbacks
- `onDeviceDiscovered`, `onConnected`, `onDataReceived`, etc.

### **Data Parsing:**
- Custom HEX parser (`BLEParser.js`)
- Converts device response to readable format

### **Command Creation:**
- Custom command builder (`BLECommands.js`)
- Creates proper HEX commands for device

---

## 📊 Data Storage

### **AsyncStorage:**
- Battery history
- User preferences
- Connection state

---

## ✅ Key Features

1. **Auto-connect**: Automatically connects to "iPowerUp Uno" when found
2. **Real-time Updates**: Live battery, temperature, charging status
3. **Cross-platform**: Same code for Android + iOS
4. **iOS Parity**: Matches iOS app behavior exactly
5. **Error Handling**: Proper error messages and retry logic

---

## 🔐 Security

- Password authentication with device
- Secure BLE communication
- Permission-based access

---

## 📝 Summary for CEO

**Bluetooth:**
- Industry-standard library (`react-native-ble-plx`)
- Direct communication with iPowerUp Uno device
- Real-time data exchange

**Battery:**
- Standard library (`react-native-device-info`)
- Direct phone battery reading (accurate)
- 5-second polling for updates

**Both are:**
- ✅ Production-ready libraries
- ✅ Well-maintained and popular
- ✅ Cross-platform compatible
- ✅ Following iOS app architecture



