# Bluetooth Connectivity - Complete Implementation Guide

## 📱 Kya Banaya Hai?

React Native app mein Bluetooth connectivity add ki hai. Ab app "iPowerUp Uno" device se connect ho sakta hai aur real-time data receive kar sakta hai.

---

## 🎯 Main Features

### 1. Auto-Scanning
- Home screen open hote hi 2 seconds baad scanning start hoti hai
- "iPowerUp Uno" device automatically dhundh leta hai
- Device milte hi automatic connect ho jata hai

### 2. Real-Time Data
- Case battery percentage (0-100%)
- Case temperature (°C ya °F)
- Phone battery percentage (phone se liya)
- Charging status (charging ho raha hai ya nahi)

### 3. Local Storage
- Charging history AsyncStorage mein save hoti hai
- Last connected device ID save hota hai
- Backend ki zarurat nahi

---

## 📁 File Structure

### Created Files:

```
src/
├── constants/
│   └── BLEConstants.js          ← UUIDs, device name, timings
├── services/
│   └── BLEManager.js            ← Main BLE service (singleton)
├── utils/
│   ├── BLECommands.js           ← Command builders
│   └── BLEParser.js             ← Response parser
├── storage/
│   └── HistoryStorage.js        ← AsyncStorage helper
└── screens/
    └── HomeScreen.js            ← Updated with BLE integration
```

---

## 🔧 Setup Instructions

### Step 1: Install Dependencies

```bash
cd ipowerup-rn
npm install
```

**New Package Added:**
- `@react-native-community/battery` - Phone battery level ke liye

### Step 2: iOS Setup

**Info.plist mein permissions add karo:**
```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>We need Bluetooth to connect to your iPowerUp device</string>
<key>NSBluetoothPeripheralUsageDescription</key>
<string>We need Bluetooth to connect to your iPowerUp device</string>
```

### Step 3: Android Setup

**AndroidManifest.xml mein permissions add karo:**
```xml
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

---

## 📖 How It Works - Complete Flow

### Phase 1: App Start

**Kya hota hai:**
```
App khulta hai
    ↓
BLEManager initialize hota hai (singleton)
    ↓
Bluetooth state check hota hai
    ├─ ON → Ready
    └─ OFF → User ko alert
```

**Code:**
- `BLEManager.js` - Constructor mein initialize
- Bluetooth state monitor karta hai

---

### Phase 2: Home Screen Open

**Kya hota hai:**
```
HomeScreen component mount hota hai
    ↓
User data load hota hai (AsyncStorage se)
    ↓
Phone battery level phone se liya jata hai
    ↓
BLEManager setup hota hai
    ↓
2 seconds wait (iOS jaisa)
    ↓
Check: Connected hai ya nahi?
    ├─ NO  → Scanning start
    └─ YES → Status query
```

**Code:**
- `HomeScreen.js` - useEffect mein setup
- `BLE_CONSTANTS.SCAN_DELAY` = 2000ms

---

### Phase 3: Bluetooth Scanning

**Kya hota hai:**
```
startScanning() called
    ↓
Bluetooth devices scan karta hai
    ↓
Har device ka naam check:
    ├─ "iPowerUp Uno" → Found! ✅
    └─ Other name → Ignore
    ↓
Auto-connect (iOS jaisa)
```

**Code:**
- `BLEManager.js` - `startScanning()` method
- Device name exact match: `BLE_CONSTANTS.DEVICE_NAME`

---

### Phase 4: Device Connection

**Kya hota hai:**
```
Device mil gaya
    ↓
Stop scanning
    ↓
Connect to device
    ↓
Discover services
    ↓
Discover characteristics
    ↓
Subscribe to notifications (RX characteristic)
    ↓
Connection successful!
    ↓
1 second wait
    ↓
Send password: [0x19, 0x88, 0x88, 0x88]
```

**Code:**
- `BLEManager.js` - `connectToDevice()` method
- `BLE_CONSTANTS.CONNECTION_DELAY` = 1000ms

---

### Phase 5: Data Communication

#### A. Command Bhejna (App → Case)

**queryPowerBankStatus Command:**
```
Command banaya jata hai:
    - Byte 0: 0x04 (command type)
    - Byte 1-6: 0x00 (padding)
    - Byte 7-8: Phone battery % (2 bytes, little-endian)
    - Byte 9-19: 0x00 (padding)
    ↓
TX characteristic pe write karo
```

**Phone Battery Kahan Se Aata Hai:**
- Phone se liya jata hai (`Battery.getBatteryLevel()`)
- Case ko bheja jata hai command mein
- Case ko pata chal jata hai phone battery kitna hai

**Code:**
- `BLECommands.js` - `createQueryPowerBankStatusCommand()`
- `HomeScreen.js` - `getPhoneBatteryLevel()` function

#### B. Response Aana (Case → App)

**Response Format (0x04):**
```
Byte 0: 0x04 (command type)
Byte 1-2: Case Battery Voltage (little-endian)
Byte 3: Case Battery Percentage (0-100) ← Case se
Byte 4: Status flags (charging states) ← Case se
Byte 5: Case Temperature (°C) ← Case se
Byte 7: Phone Battery % (confirmation, ignore)
Byte 8-9: Solar Current (little-endian) ← Case se
```

**Parsing:**
- `BLEParser.js` - `parsePowerBankStatus()` function
- Data extract karke state update hota hai

**Code:**
- `BLEManager.js` - `handleNotification()` method
- `HomeScreen.js` - `onDataReceived` callback

---

### Phase 6: UI Update

**Kya hota hai:**
```
Data parse hua
    ↓
State update:
    - setCaseBatteryLevel(data.caseBatPct)
    - setCaseTemperature(data.caseTemp)
    - setPhoneBatteryLevel(phone se liya)
    - setIsCharging(data.phoneCharging)
    ↓
Screen refresh (UI update)
```

**Code:**
- `HomeScreen.js` - State updates
- Real-time UI refresh

---

### Phase 7: Periodic Updates

**Kya hota hai:**
```
Connected rahe toh:
    ↓
Har 5 seconds:
    - Phone battery phone se lo
    - queryPowerBankStatus() bhejo
    - Response aayega
    - UI update
```

**Code:**
- `BLEManager.js` - `startPeriodicQueries()` method
- `BLE_CONSTANTS.QUERY_INTERVAL` = 5000ms

---

### Phase 8: Local Storage

**Kya hota hai:**
```
Data aane par:
    ↓
History save karo (AsyncStorage):
    {
      timestamp: Date.now(),
      phoneBattery: 85,
      caseBattery: 90,
      temperature: 25,
      phoneCharging: true,
      solarCurrent: 200
    }
    ↓
Last connected device ID save karo
```

**Code:**
- `HistoryStorage.js` - `saveHistoryEntry()` function
- `HomeScreen.js` - Data receive par save

---

## 🔑 Key Components Explained

### 1. BLEConstants.js

**Kya hai:**
- Sab constants ek jagah
- UUIDs (service aur characteristics)
- Device name
- Timings (delays, intervals)

**Important Values:**
```javascript
DEVICE_NAME: 'iPowerUp Uno'
SERVICE_UUID: '000056ff-0000-1000-8000-00805f9b34fb'
RX_UUID: '000033F4-0000-1000-8000-00805f9b34fb' (Case→Phone)
TX_UUID: '000033f3-0000-1000-8000-00805f9b34fb' (Phone→Case)
SCAN_DELAY: 2000ms
CONNECTION_DELAY: 1000ms
QUERY_INTERVAL: 5000ms
```

---

### 2. BLECommands.js

**Kya hai:**
- Sab commands banane ke functions
- Exact iOS protocol follow karta hai

**Main Commands:**
- `createPasswordCommand()` - Password bhejne ke liye
- `createQueryPowerBankStatusCommand(phoneBattery)` - Status puchne ke liye

**Example:**
```javascript
// Password command
[0x19, 0x88, 0x88, 0x88]

// Query status command
0x04 + phone battery % (2 bytes) + padding
```

---

### 3. BLEParser.js

**Kya hai:**
- Response parse karne ke functions
- Exact iOS parsing logic

**Main Function:**
- `parsePowerBankStatus(data, temperatureUnit)` - 0x04 response parse karta hai

**Returns:**
```javascript
{
  caseBatPct: 90,        // Case battery %
  caseTemp: 25,          // Temperature
  phoneCharging: true,   // Charging status
  solarCurr: 200,        // Solar current
  // ... other fields
}
```

---

### 4. BLEManager.js

**Kya hai:**
- Main BLE service (singleton pattern)
- Sab kuch handle karta hai: scanning, connection, commands, data

**Main Methods:**
- `startScanning()` - Scanning start
- `connectToDevice(device)` - Device connect
- `sendPassword()` - Password bhejna
- `queryPowerBankStatus()` - Status query
- `startPeriodicQueries()` - Periodic updates

**Delegate Pattern (iOS jaisa):**
```javascript
setDelegate({
  onDeviceDiscovered: (device) => {...},
  onConnected: (device) => {...},
  onDataReceived: (data) => {...},
  // ... other callbacks
})
```

---

### 5. HistoryStorage.js

**Kya hai:**
- AsyncStorage helper functions
- History save/load karta hai

**Main Functions:**
- `saveHistoryEntry(entry)` - History save
- `getHistory()` - History load
- `clearHistory()` - History clear
- `saveLastConnectedDevice(deviceId)` - Device ID save

---

### 6. HomeScreen.js

**Kya hai:**
- Main screen with BLE integration
- Real-time data display
- UI updates

**Main Features:**
- Phone battery display (phone se)
- Case battery display (case se)
- Temperature display (case se)
- Charging status indicator
- Connection status indicator

---

## 📊 Data Flow Diagram

```
┌─────────────┐
│   Phone     │
│  Battery    │ ← Phone se liya (Battery.getBatteryLevel())
└──────┬──────┘
       │
       ↓
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   App       │─────▶│    Case      │─────▶│   App       │
│ (Command)   │      │  (Response)  │      │ (Parse)     │
└─────────────┘      └──────────────┘      └─────────────┘
       │                                           │
       │                                           ↓
       │                                    ┌─────────────┐
       │                                    │    UI       │
       │                                    │  Update     │
       │                                    └─────────────┘
       │                                           │
       └───────────────────────────────────────────┘
                      AsyncStorage
                      (History Save)
```

---

## 🎨 UI/UX - iOS Jaisa

### Screen Layout:
1. **Header** - Greeting + Notification bell
2. **Phone Section** - Phone battery card
3. **Case Section** - Case battery card
4. **Temperature Card** - Temperature display
5. **Transfer Power Slider** - Charging toggle

### Features:
- Same images as iOS (battery, temperature, slider)
- Same colors and styling
- Same layout structure
- Connection status indicator

---

## 🔄 Complete Flow Summary

### Step-by-Step:

1. **App Start** → BLEManager initialize
2. **Home Screen** → 2 sec delay → Scanning start
3. **Device Found** → Auto-connect
4. **Connected** → 1 sec delay → Password send
5. **Password Sent** → Query status
6. **Data Received** → Parse → UI update
7. **Periodic Updates** → Every 5 seconds
8. **History Save** → AsyncStorage

---

## 📝 Important Notes

### Phone Battery:
- **Source:** Phone se liya jata hai (system API)
- **Case se nahi aata** - Case se sirf confirmation aata hai
- **Code:** `Battery.getBatteryLevel()`

### Case Data:
- **Source:** Case se aata hai (Bluetooth)
- **Includes:** Battery %, temperature, charging status, solar current
- **Code:** `parsePowerBankStatus()` se parse

### Protocol:
- **Exact iOS protocol** follow karta hai
- **Same UUIDs** use karta hai
- **Same commands** bhejta hai
- **Same parsing** karta hai

---

## 🚀 How to Test

### Step 1: Run App
```bash
npm run ios    # iOS ke liye
npm run android # Android ke liye
```

### Step 2: Check Flow
1. App open karo
2. Home screen pe jao
3. 2 seconds wait karo
4. Scanning start hogi
5. Device milte hi auto-connect hoga
6. Data aana start hoga

### Step 3: Verify
- Phone battery display ho raha hai?
- Case battery display ho raha hai?
- Temperature display ho raha hai?
- Connection status dikh raha hai?

---

## 🐛 Troubleshooting

### Bluetooth Off:
- User ko alert dikhega
- Bluetooth enable karna hoga

### Device Not Found:
- Device name check karo: "iPowerUp Uno" (exact match)
- Bluetooth range check karo
- Device ON hai ya nahi

### Connection Failed:
- Retry automatically hoga (3 seconds baad)
- Scanning restart hogi

### Data Not Coming:
- Check notifications subscribe hui ya nahi
- Check command properly bhej rahe hain ya nahi
- Check response parsing sahi hai ya nahi

---

## 📦 Dependencies

### Required Packages:
- `react-native-ble-plx` - Bluetooth connectivity
- `@react-native-community/battery` - Phone battery
- `@react-native-async-storage/async-storage` - Local storage

### Already Installed:
- React Native core
- Navigation
- Other UI components

---

## ✅ What's Working

1. ✅ Auto-scanning on HomeScreen
2. ✅ Auto-connect to "iPowerUp Uno"
3. ✅ Password command sending
4. ✅ Status query with phone battery
5. ✅ Response parsing (exact iOS)
6. ✅ Real-time UI updates
7. ✅ Periodic queries (5 seconds)
8. ✅ Local history storage
9. ✅ Phone battery from phone
10. ✅ Case data from case

---

## 🎯 Next Steps (Future)

1. Enable/Disable charging commands
2. History screen with stored data
3. Temperature unit toggle
4. Alerts for low battery/temperature
5. Reconnect on app restart

---

## 📞 Support

Agar koi issue aaye:
1. Check Bluetooth ON hai ya nahi
2. Check device name exact match hai ya nahi
3. Check console logs for errors
4. Check permissions properly set hain ya nahi

---

## 🎉 Summary

**Complete Bluetooth implementation ho gaya hai!**

- ✅ iOS protocol exact follow
- ✅ Auto-scanning aur auto-connect
- ✅ Real-time data updates
- ✅ Local storage (no backend)
- ✅ UI/UX iOS jaisa
- ✅ Best to best implementation

**Ab demo ke liye ready hai!** 🚀












