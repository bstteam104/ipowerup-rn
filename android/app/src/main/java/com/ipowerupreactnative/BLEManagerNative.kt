package com.ipowerupreactnative

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCallback
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattDescriptor
import android.bluetooth.BluetoothGattService
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.bluetooth.le.BluetoothLeScanner
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.UUID

/**
 * Native Kotlin BLE Manager - Exact match to iOS Swift BLEManager
 * Uses Android's native BluetoothLeScanner and BluetoothGatt (like iOS uses CoreBluetooth)
 */
class BLEManagerNative(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "BLEManagerNative"
        
        // UUIDs - Exact match to iOS
        private val SERVICE_UUID = UUID.fromString("000056ff-0000-1000-8000-00805f9b34fb")
        private val RX_CHARACTERISTIC_UUID = UUID.fromString("000033F4-0000-1000-8000-00805f9b34fb") // Case → Phone
        private val TX_CHARACTERISTIC_UUID = UUID.fromString("000033f3-0000-1000-8000-00805f9b34fb") // Phone → Case
        
        // Device name filter
        private const val DEVICE_NAME = "iPowerUp Uno"
        
        // Timing - Exact match to iOS (1 second after connection initiated)
        private const val PASSWORD_DELAY_MS = 1000L
    }

    private var bluetoothManager: BluetoothManager? = null
    private var bluetoothAdapter: BluetoothAdapter? = null
    private var bluetoothLeScanner: BluetoothLeScanner? = null
    private var bluetoothGatt: BluetoothGatt? = null
    
    private var isScanning = false
    private var isConnected = false
    private var isConnecting = false
    
    private val discoveredDevices = mutableListOf<BluetoothDevice>()
    private var connectedDevice: BluetoothDevice? = null
    
    private var writeCharacteristic: BluetoothGattCharacteristic? = null
    private var notifyCharacteristic: BluetoothGattCharacteristic? = null
    
    private val mainHandler = Handler(Looper.getMainLooper())
    private var passwordTimer: Runnable? = null
    private var connectionVerificationTimer: Runnable? = null

    init {
        val context = reactApplicationContext.applicationContext
        bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
        bluetoothAdapter = bluetoothManager?.adapter
        bluetoothLeScanner = bluetoothAdapter?.bluetoothLeScanner
    }

    override fun getName(): String = "BLEManagerNative"

    // MARK: - React Native Methods

    @ReactMethod
    fun startScanning(promise: Promise) {
        try {
            if (isScanning) {
                promise.resolve(true)
                return
            }

            if (bluetoothAdapter == null || !bluetoothAdapter!!.isEnabled) {
                promise.reject("BLUETOOTH_OFF", "Bluetooth is not enabled")
                return
            }

            if (bluetoothLeScanner == null) {
                promise.reject("SCANNER_UNAVAILABLE", "Bluetooth LE Scanner is not available")
                return
            }

            discoveredDevices.clear()
            isScanning = true

            // iOS: centralManager.scanForPeripherals(withServices: nil, options: nil)
            // Android: Scan for all devices, filter by name in callback
            val scanSettings = ScanSettings.Builder()
                .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
                .build()

            bluetoothLeScanner?.startScan(null, scanSettings, scanCallback)
            
            sendEvent("onScanStarted", null)
            promise.resolve(true)
            
            Log.d(TAG, "✅ Started scanning")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error starting scan: ${e.message}", e)
            promise.reject("SCAN_ERROR", "Failed to start scanning: ${e.message}", e)
        }
    }

    @ReactMethod
    fun stopScanning(promise: Promise) {
        try {
            if (!isScanning) {
                promise.resolve(true)
                return
            }

            bluetoothLeScanner?.stopScan(scanCallback)
            isScanning = false
            
            sendEvent("onScanStopped", null)
            promise.resolve(true)
            
            Log.d(TAG, "✅ Stopped scanning")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error stopping scan: ${e.message}", e)
            promise.reject("STOP_SCAN_ERROR", "Failed to stop scanning: ${e.message}", e)
        }
    }

    @ReactMethod
    fun connectToDevice(deviceAddress: String, promise: Promise) {
        try {
            if (isConnecting || isConnected) {
                promise.reject("ALREADY_CONNECTING", "Connection already in progress or connected")
                return
            }

            if (bluetoothAdapter == null) {
                promise.reject("BLUETOOTH_UNAVAILABLE", "Bluetooth adapter is not available")
                return
            }

            // Find device by address
            val device = bluetoothAdapter!!.getRemoteDevice(deviceAddress)
            if (device == null) {
                promise.reject("DEVICE_NOT_FOUND", "Device not found: $deviceAddress")
                return
            }

            // iOS: self.connectedPeripheral = peripheral (before connect)
            connectedDevice = device
            isConnecting = true

            // Stop scanning (iOS: centralManager.stopScan())
            if (isScanning) {
                bluetoothLeScanner?.stopScan(scanCallback)
                isScanning = false
            }

            // iOS: centralManager.connect(peripheral, options: options)
            // Android: connectGatt
            // CRITICAL: Use autoConnect = false for immediate connection (like iOS)
            // But we need to ensure GATT is properly maintained
            bluetoothGatt = device.connectGatt(
                reactApplicationContext.applicationContext,
                false, // autoConnect = false (immediate connection, like iOS)
                gattCallback,
                BluetoothDevice.TRANSPORT_LE // Explicitly use LE transport
            )

            // Reset password retry count
            passwordRetryCount = 0
            
            // iOS: DispatchQueue.main.asyncAfter(deadline: .now() + 1) { self.sendCommand(.sendPassword) }
            // Start password timer immediately (1 second after connection initiated)
            passwordTimer = Runnable {
                sendPasswordCommand()
            }
            mainHandler.postDelayed(passwordTimer!!, PASSWORD_DELAY_MS)

            sendEvent("onConnecting", createDeviceMap(device))
            promise.resolve(true)
            
            Log.d(TAG, "🔌 Connecting to device: ${device.name ?: deviceAddress}")
        } catch (e: Exception) {
            isConnecting = false
            connectedDevice = null
            Log.e(TAG, "❌ Error connecting: ${e.message}", e)
            promise.reject("CONNECT_ERROR", "Failed to connect: ${e.message}", e)
        }
    }

    @ReactMethod
    fun disconnectDevice(promise: Promise) {
        try {
            // CRITICAL: Properly disconnect and close GATT
            if (bluetoothGatt != null) {
                try {
                    bluetoothGatt!!.disconnect()
                } catch (e: Exception) {
                    Log.w(TAG, "Error during disconnect: ${e.message}")
                }
                
                // Close GATT after a short delay to ensure disconnect completes
                mainHandler.postDelayed({
                    try {
                        bluetoothGatt?.close()
                    } catch (e: Exception) {
                        Log.w(TAG, "Error closing GATT: ${e.message}")
                    }
                    bluetoothGatt = null
                }, 100)
            }

            // Stop connection verification
            stopConnectionVerification()
            
            // Clear password timer
            passwordTimer?.let { mainHandler.removeCallbacks(it) }
            passwordTimer = null

            isConnected = false
            isConnecting = false
            connectedDevice = null
            writeCharacteristic = null
            notifyCharacteristic = null

            sendEvent("onDisconnected", null)
            promise.resolve(true)
            
            Log.d(TAG, "🔌 Disconnected")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error disconnecting: ${e.message}", e)
            promise.reject("DISCONNECT_ERROR", "Failed to disconnect: ${e.message}", e)
        }
    }

    @ReactMethod
    fun sendCommand(commandType: Int, value: Int, promise: Promise) {
        try {
            // CRITICAL: Verify connection state before sending
            if (!isConnected) {
                promise.reject("NOT_CONNECTED", "Not connected")
                return
            }
            
            if (writeCharacteristic == null) {
                promise.reject("CHARACTERISTIC_NOT_READY", "Write characteristic not ready")
                return
            }
            
            if (bluetoothGatt == null) {
                promise.reject("GATT_NULL", "GATT connection is null")
                return
            }

            // Create command packet (you'll need to implement this based on your command structure)
            val commandData = createCommandPacket(commandType, value)
            
            // iOS: peripheral.writeValue(data, for: writeCharacters, type: .withoutResponse)
            writeCharacteristic!!.value = commandData
            writeCharacteristic!!.writeType = BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE
            
            // CRITICAL: Double-check connection before writing
            if (!isConnected || bluetoothGatt == null) {
                promise.reject("CONNECTION_LOST", "Connection lost before write")
                return
            }
            
            val success = bluetoothGatt!!.writeCharacteristic(writeCharacteristic!!)
            
            if (success) {
                // Log specific commands for better debugging
                when (commandType) {
                    0x21 -> Log.d(TAG, "📤 Sent command: ENABLE_PHONE_CHARGING (0x21)")
                    0x18 -> Log.d(TAG, "📤 Sent command: STOP_CHARGING (0x18)")
                    0x04 -> Log.d(TAG, "📤 Sent command: QUERY_POWER_BANK_STATUS (0x04)")
                    0x19 -> Log.d(TAG, "📤 Sent command: SEND_PASSWORD (0x19)")
                    else -> Log.d(TAG, "📤 Sent command: $commandType (0x${commandType.toString(16)})")
                }
                promise.resolve(true)
            } else {
                Log.e(TAG, "❌ Write returned false for command: $commandType (0x${commandType.toString(16)})")
                promise.reject("WRITE_FAILED", "Failed to write characteristic")
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error sending command: ${e.message}", e)
            promise.reject("SEND_ERROR", "Failed to send command: ${e.message}", e)
        }
    }

    @ReactMethod
    fun getDiscoveredDevices(promise: Promise) {
        try {
            val devicesArray = Arguments.createArray()
            discoveredDevices.forEach { device ->
                devicesArray.pushMap(createDeviceMap(device))
            }
            promise.resolve(devicesArray)
        } catch (e: Exception) {
            promise.reject("GET_DEVICES_ERROR", "Failed to get devices: ${e.message}", e)
        }
    }

    @ReactMethod
    fun getConnectionState(promise: Promise) {
        try {
            val state = Arguments.createMap()
            state.putBoolean("isConnected", isConnected)
            state.putBoolean("isScanning", isScanning)
            state.putBoolean("isConnecting", isConnecting)
            
            // CRITICAL: Verify actual GATT connection state
            val actualGattState = verifyActualConnectionState()
            state.putBoolean("actualGattConnected", actualGattState)
            state.putBoolean("gattExists", bluetoothGatt != null)
            
            // If our flag says connected but GATT is not actually connected, fix it
            if (isConnected && !actualGattState) {
                Log.w(TAG, "⚠️ Connection state mismatch: isConnected=true but GATT not connected")
                // Don't auto-fix here, let the callback handle it
            }
            
            promise.resolve(state)
        } catch (e: Exception) {
            promise.reject("GET_STATE_ERROR", "Failed to get state: ${e.message}", e)
        }
    }
    
    // Verify actual GATT connection state
    private fun verifyActualConnectionState(): Boolean {
        return try {
            if (bluetoothGatt == null) {
                return false
            }
            
            // Check if GATT is actually connected by checking the device's connection state
            val device = bluetoothGatt?.device
            if (device == null) {
                return false
            }
            
            // Get connection state from BluetoothManager
            val bluetoothManager = reactApplicationContext.getSystemService(android.content.Context.BLUETOOTH_SERVICE) as android.bluetooth.BluetoothManager
            val connectionState = bluetoothManager.getConnectionState(device, BluetoothProfile.GATT)
            
            val isActuallyConnected = (connectionState == BluetoothProfile.STATE_CONNECTED)
            
            if (isConnected != isActuallyConnected) {
                Log.w(TAG, "⚠️ Connection state mismatch: isConnected=$isConnected, actualGattState=$isActuallyConnected")
            }
            
            isActuallyConnected
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error verifying connection state: ${e.message}")
            false
        }
    }
    
    // Start periodic connection verification
    // NOTE: BLE devices may not show in Bluetooth settings - this is NORMAL for GATT connections
    // We only verify to log status, not to disconnect (let GATT callbacks handle disconnects)
    private fun startConnectionVerification() {
        stopConnectionVerification() // Stop any existing verification
        
        connectionVerificationTimer = Runnable {
            if (isConnected) {
                val actualState = verifyActualConnectionState()
                if (!actualState) {
                    // Log warning but DON'T disconnect - let GATT callbacks handle it
                    // Android GATT state might not always match immediately, and BLE devices
                    // don't always show in Bluetooth settings (this is normal)
                    Log.w(TAG, "⚠️ Connection verification: GATT state mismatch (this may be normal for BLE)")
                    Log.w(TAG, "⚠️ Note: BLE devices may not show in Bluetooth settings - this is expected")
                    Log.w(TAG, "⚠️ Connection will be maintained if GATT is actually connected")
                    
                    // Continue verification - don't disconnect automatically
                    // The actual disconnect will come from onConnectionStateChange callback
                    mainHandler.postDelayed(connectionVerificationTimer!!, 5000) // Check every 5 seconds (less aggressive)
                } else {
                    // Connection is still active, continue verification
                    Log.d(TAG, "✅ Connection verification: GATT is connected")
                    mainHandler.postDelayed(connectionVerificationTimer!!, 5000) // Check every 5 seconds
                }
            } else {
                // Not connected, stop verification
                stopConnectionVerification()
            }
        }
        
        // Start first check after 5 seconds (less aggressive)
        mainHandler.postDelayed(connectionVerificationTimer!!, 5000)
        Log.d(TAG, "✅ Started connection verification (every 5 seconds - logging only)")
    }
    
    // Stop connection verification
    private fun stopConnectionVerification() {
        connectionVerificationTimer?.let { mainHandler.removeCallbacks(it) }
        connectionVerificationTimer = null
    }

    // MARK: - Private Helper Methods

    private var passwordRetryCount = 0
    private val MAX_PASSWORD_RETRIES = 10 // 10 retries * 200ms = 2 seconds total
    
    private fun sendPasswordCommand() {
        try {
            // CRITICAL: Check each condition separately for better error handling
            if (!isConnected) {
                passwordRetryCount++
                if (passwordRetryCount < MAX_PASSWORD_RETRIES) {
                    Log.w(TAG, "⚠️ Cannot send password: not connected, retry $passwordRetryCount/$MAX_PASSWORD_RETRIES")
                    mainHandler.postDelayed({
                        if (isConnecting || isConnected) {
                            sendPasswordCommand()
                        }
                    }, 300) // Increased delay
                    return
                } else {
                    Log.e(TAG, "❌ Cannot send password: max retries reached (not connected)")
                    passwordRetryCount = 0
                    return
                }
            }
            
            if (writeCharacteristic == null) {
                passwordRetryCount++
                if (passwordRetryCount < MAX_PASSWORD_RETRIES) {
                    Log.w(TAG, "⚠️ Cannot send password: characteristic not ready, retry $passwordRetryCount/$MAX_PASSWORD_RETRIES")
                    mainHandler.postDelayed({
                        if (isConnected && bluetoothGatt != null) {
                            sendPasswordCommand()
                        }
                    }, 300)
                    return
                } else {
                    Log.e(TAG, "❌ Cannot send password: max retries reached (characteristic not ready)")
                    passwordRetryCount = 0
                    return
                }
            }
            
            if (bluetoothGatt == null) {
                passwordRetryCount++
                if (passwordRetryCount < MAX_PASSWORD_RETRIES) {
                    Log.w(TAG, "⚠️ Cannot send password: GATT null, retry $passwordRetryCount/$MAX_PASSWORD_RETRIES")
                    mainHandler.postDelayed({
                        if (isConnected) {
                            sendPasswordCommand()
                        }
                    }, 300)
                    return
                } else {
                    Log.e(TAG, "❌ Cannot send password: max retries reached (GATT null)")
                    passwordRetryCount = 0
                    return
                }
            }
            
            // Reset retry count on success
            passwordRetryCount = 0

            // iOS: COMMAND_SEND_PASSWORD = 0x19
            val passwordData = createCommandPacket(0x19, 0)
            
            // CRITICAL: Final connection check before write
            if (!isConnected || bluetoothGatt == null || writeCharacteristic == null) {
                Log.w(TAG, "⚠️ Connection lost just before sending password")
                return
            }
            
            writeCharacteristic!!.value = passwordData
            writeCharacteristic!!.writeType = BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE
            
            val success = bluetoothGatt!!.writeCharacteristic(writeCharacteristic!!)
            if (success) {
                Log.d(TAG, "📤 Sent password command successfully")
            } else {
                Log.e(TAG, "❌ Failed to send password (write returned false)")
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error sending password: ${e.message}", e)
        }
    }

    private fun createCommandPacket(commandType: Int, value: Int): ByteArray {
        // Match iOS command.packet() and JS BLECommands.js structure
        // All commands are 20-byte buffers with command type at index 0
        val packet = ByteArray(20) { 0x00 }
        packet[0] = commandType.toByte()
        
        // For password command (0x19): [0x19, 0x88, 0x88, 0x88, ...]
        if (commandType == 0x19) {
            packet[1] = 0x88.toByte()
            packet[2] = 0x88.toByte()
            packet[3] = 0x88.toByte()
        }
        
        // For query power bank status (0x04): battery % at bytes 7-8 (little-endian)
        // iOS: Always sets battery (even if 0) - bytes 1-6 are 0x00, bytes 7-8 are battery
        if (commandType == 0x04) {
            val battery = value.coerceIn(0, 100)
            // iOS: littleEndian means lower byte first
            packet[7] = (battery and 0xFF).toByte()        // Lower byte (LSB)
            packet[8] = ((battery shr 8) and 0xFF).toByte() // Higher byte (MSB)
            // Bytes 1-6 are already 0x00 (from ByteArray initialization)
        }
        
        return packet
    }

    private fun createDeviceMap(device: BluetoothDevice): WritableMap {
        val map = Arguments.createMap()
        map.putString("id", device.address)
        map.putString("name", device.name ?: "Unknown")
        map.putString("address", device.address)
        return map
    }

    private fun sendEvent(eventName: String, params: WritableMap?) {
        try {
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error sending event: ${e.message}", e)
        }
    }

    // MARK: - BluetoothLeScanner Callback (iOS: didDiscover)

    private val scanCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult) {
            val device = result.device
            
            // CRITICAL: Android mein device.name scan ke time NULL ho sakta hai!
            // iOS mein peripheral.name directly available hai, but Android mein advertisement data check karna padta hai
            var deviceName = device.name
            
            // If device.name is null, check advertisement data (ScanRecord)
            if (deviceName == null || deviceName.isEmpty()) {
                val scanRecord = result.scanRecord
                if (scanRecord != null) {
                    // Get device name from advertisement data
                    val advName = scanRecord.deviceName
                    if (advName != null && advName.isNotEmpty()) {
                        deviceName = advName
                        Log.d(TAG, "📡 Device name from advertisement: $deviceName")
                    }
                }
            }
            
            // iOS: guard let deviceName = peripheral.name, deviceName == "iPowerUp Uno" else { return }
            if (deviceName == null || deviceName != DEVICE_NAME) {
                // Log for debugging - might be other devices
                if (deviceName != null && deviceName.isNotEmpty()) {
                    Log.d(TAG, "⏭️ Ignoring device: $deviceName (expected: $DEVICE_NAME)")
                } else {
                    Log.d(TAG, "⏭️ Ignoring device with no name: ${device.address}")
                }
                return
            }

            // Avoid duplicates (iOS: !self.discoveredDevices.contains(where: { $0.peripheral == peripheral }))
            if (discoveredDevices.any { it.address == device.address }) {
                Log.d(TAG, "⏭️ Duplicate device ignored: $deviceName (${device.address})")
                return
            }

            Log.d(TAG, "✅ Discovered: $deviceName (${device.address})")
            
            discoveredDevices.add(device)
            
            val deviceMap = createDeviceMap(device)
            sendEvent("onDeviceDiscovered", deviceMap)
        }

        override fun onScanFailed(errorCode: Int) {
            Log.e(TAG, "❌ Scan failed: $errorCode")
            isScanning = false
            sendEvent("onScanFailed", Arguments.createMap().apply {
                putInt("errorCode", errorCode)
            })
        }
    }

    // MARK: - BluetoothGattCallback (iOS: didConnect, didDiscoverServices, etc.)

    private val gattCallback = object : BluetoothGattCallback() {
        override fun onConnectionStateChange(gatt: BluetoothGatt, status: Int, newState: Int) {
                // CRITICAL: Check status first - if status != GATT_SUCCESS, connection failed
            if (status != BluetoothGatt.GATT_SUCCESS) {
                Log.e(TAG, "❌ Connection state change failed with status: $status")
                // GATT status codes: 0 = SUCCESS, 1-255 = various errors
                // Common error codes: 0x08 = GATT_CONNECTION_TIMEOUT, 0x85 = GATT_INTERNAL_ERROR, 0x01 = GATT_FAILURE
                when (status) {
                    0x08 -> { // GATT_CONNECTION_TIMEOUT
                        Log.e(TAG, "Connection timeout")
                    }
                    0x85 -> { // GATT_INTERNAL_ERROR
                        Log.e(TAG, "Internal GATT error")
                    }
                    0x01 -> { // GATT_FAILURE
                        Log.e(TAG, "GATT failure")
                    }
                    else -> {
                        Log.e(TAG, "Unknown GATT error: $status")
                    }
                }
                
                // Only disconnect if we were actually connected/connecting
                if (isConnected || isConnecting) {
                    isConnected = false
                    isConnecting = false
                    connectedDevice = null
                    
                    // Clear password timer
                    passwordTimer?.let { mainHandler.removeCallbacks(it) }
                    passwordTimer = null
                    
                    // Close GATT if it exists
                    try {
                        gatt.close()
                    } catch (e: Exception) {
                        Log.e(TAG, "Error closing GATT: ${e.message}")
                    }
                    bluetoothGatt = null
                    
                    sendEvent("onConnectionFailed", Arguments.createMap().apply {
                        putString("error", "GATT error: $status")
                        putInt("status", status)
                    })
                }
                return
            }
            
            when (newState) {
                BluetoothProfile.STATE_CONNECTED -> {
                    // iOS: func centralManager(_:didConnect:) - line 195
                    Log.d(TAG, "🎉 Connected to device (status: $status)")
                    Log.d(TAG, "📱 Device: ${gatt.device.name ?: gatt.device.address}")
                    Log.d(TAG, "📱 Device address: ${gatt.device.address}")
                    
                    // iOS line 197: isConnected = true (set immediately in didConnect)
                    isConnected = true
                    isConnecting = false
                    
                    // CRITICAL: Store GATT reference to keep connection alive
                    bluetoothGatt = gatt
                    
                    // CRITICAL: Verify connection is actually established
                    val actualState = verifyActualConnectionState()
                    Log.d(TAG, "🔍 Actual GATT connection state: $actualState")
                    
                    // CRITICAL: Request high connection priority for stable connection (API 21+)
                    // This reduces connection interval and improves stability
                    try {
                        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
                            val prioritySuccess = gatt.requestConnectionPriority(BluetoothGatt.CONNECTION_PRIORITY_HIGH)
                            if (prioritySuccess) {
                                Log.d(TAG, "✅ Connection priority set to HIGH")
                            } else {
                                Log.w(TAG, "⚠️ Failed to set connection priority")
                            }
                        }
                    } catch (e: Exception) {
                        Log.w(TAG, "⚠️ Error setting connection priority: ${e.message}")
                        // Continue anyway - not critical
                    }
                    
                    val device = gatt.device
                    // iOS line 199-200: delegate?.didConnect(to: peripheral) and didUpdateConnectionState
                    val deviceMap = createDeviceMap(device)
                    // Add actual connection state to the event
                    deviceMap.putBoolean("actualGattConnected", actualState)
                    sendEvent("onConnected", deviceMap)
                    
                    // iOS line 203: connectedPeripheral?.discoverServices([Self.serviceUUID])
                    // CRITICAL: Discover services immediately - this keeps connection alive
                    // Small delay to ensure connection is fully established
                    mainHandler.postDelayed({
                        // CRITICAL: Verify connection is still active before discovering services
                        val stillConnected = verifyActualConnectionState()
                        if (!stillConnected) {
                            Log.e(TAG, "❌ Connection lost before service discovery")
                            isConnected = false
                            sendEvent("onDisconnected", Arguments.createMap().apply {
                                putString("reason", "Connection lost before service discovery")
                                putInt("status", -1)
                            })
                            return@postDelayed
                        }
                        
                        if (isConnected && bluetoothGatt != null) {
                            Log.d(TAG, "🔍 Starting service discovery...")
                            val discoverSuccess = bluetoothGatt?.discoverServices() ?: false
                            if (!discoverSuccess) {
                                Log.e(TAG, "❌ Failed to start service discovery")
                                // Retry after short delay
                                mainHandler.postDelayed({
                                    val stillConnectedRetry = verifyActualConnectionState()
                                    if (stillConnectedRetry && isConnected && bluetoothGatt != null) {
                                        Log.d(TAG, "🔄 Retrying service discovery...")
                                        bluetoothGatt?.discoverServices()
                                    } else {
                                        Log.e(TAG, "❌ Connection lost during service discovery retry")
                                    }
                                }, 500)
                            } else {
                                Log.d(TAG, "✅ Service discovery started successfully")
                            }
                        }
                    }, 100) // Small delay to ensure connection is stable
                    
                    // CRITICAL: Start periodic connection verification
                    // Check every 2 seconds if connection is still active
                    startConnectionVerification()
                }
                
                BluetoothProfile.STATE_DISCONNECTED -> {
                    // iOS: func centralManager(_:didDisconnectPeripheral:) - line 214
                    // Determine disconnect reason
                    // GATT status codes: 0 = SUCCESS, 0x08 = CONNECTION_TIMEOUT, 0x85 = INTERNAL_ERROR, 0x01 = FAILURE
                    val disconnectReason = when (status) {
                        0x08 -> "Connection timeout" // GATT_CONNECTION_TIMEOUT
                        0x85 -> "Internal GATT error" // GATT_INTERNAL_ERROR
                        0x01 -> "GATT failure" // GATT_FAILURE
                        BluetoothGatt.GATT_SUCCESS -> "Normal disconnect"
                        else -> "GATT error: $status"
                    }
                    
                    Log.d(TAG, "🔌 Disconnected from device - Reason: $disconnectReason (status: $status)")
                    
                    // Only process disconnect if we were actually connected
                    // CRITICAL: Save state BEFORE clearing it
                    val wasConnected = isConnected
                    val wasConnecting = isConnecting
                    val deviceName = connectedDevice?.name ?: "Unknown"
                    val deviceAddress = connectedDevice?.address ?: "N/A"
                    
                    if (wasConnected || wasConnecting) {
                        isConnected = false
                        isConnecting = false
                        
                        // Stop connection verification
                        stopConnectionVerification()
                        
                        // Clear password timer
                        passwordTimer?.let { mainHandler.removeCallbacks(it) }
                        passwordTimer = null
                        
                        // Send disconnect event with reason
                        val disconnectMap = Arguments.createMap()
                        disconnectMap.putString("reason", disconnectReason)
                        disconnectMap.putInt("status", status)
                        disconnectMap.putString("timestamp", java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss", java.util.Locale.getDefault()).format(java.util.Date()))
                        
                        // Add connection state info (saved before clearing)
                        disconnectMap.putBoolean("wasConnected", wasConnected)
                        disconnectMap.putBoolean("wasConnecting", wasConnecting)
                        disconnectMap.putString("deviceName", deviceName)
                        disconnectMap.putString("deviceAddress", deviceAddress)
                        
                        sendEvent("onDisconnected", disconnectMap)
                        
                        // Don't close GATT here - let it be closed explicitly or on reconnect
                        // Closing GATT prematurely can cause issues
                    }
                }
            }
        }

        override fun onServicesDiscovered(gatt: BluetoothGatt, status: Int) {
            if (status != BluetoothGatt.GATT_SUCCESS) {
                Log.e(TAG, "❌ Service discovery failed: $status")
                // Retry service discovery
                mainHandler.postDelayed({
                    if (isConnected && bluetoothGatt != null) {
                        Log.d(TAG, "🔄 Retrying service discovery...")
                        bluetoothGatt?.discoverServices()
                    }
                }, 1000)
                sendEvent("onServiceDiscoveryFailed", Arguments.createMap().apply {
                    putInt("status", status)
                })
                return
            }

            // iOS: func peripheral(_:didDiscoverServices:) - line 222
            Log.d(TAG, "🔍 Services discovered successfully")
            
            // CRITICAL: Ensure we still have a valid connection
            if (!isConnected || bluetoothGatt == null) {
                Log.e(TAG, "❌ Connection lost during service discovery")
                return
            }
            
            val service = gatt.getService(SERVICE_UUID)
            if (service == null) {
                Log.e(TAG, "❌ Service not found: $SERVICE_UUID")
                // List all available services for debugging
                val services = gatt.services
                Log.d(TAG, "Available services (${services?.size ?: 0}):")
                services?.forEach { svc ->
                    Log.d(TAG, "  - ${svc.uuid}")
                }
                // Don't return - try to continue with characteristics discovery
                // Some devices might expose characteristics directly
            }

            // iOS line 231: characteristicUUIDs = [Self.rxCharacteristicUUID, Self.txCharacteristicUUID]
            // iOS line 238: peripheral.discoverCharacteristics(characteristicUUIDs, for: service)
            // Android: Characteristics are automatically discovered with services
            // But we need to process them to match iOS protocol
            
            // CRITICAL: iOS explicitly discovers both RX and TX characteristics
            // Android: Characteristics should be available after service discovery
            val characteristics = service.characteristics
            if (characteristics != null && characteristics.isNotEmpty()) {
                Log.d(TAG, "✅ Found ${characteristics.size} characteristics in service")
                // Process characteristics immediately (iOS does this in didDiscoverCharacteristicsFor)
                processCharacteristics(gatt)
            } else {
                Log.w(TAG, "⚠️ No characteristics found in service, retrying...")
                // Retry after delay - characteristics might not be ready yet
                mainHandler.postDelayed({
                    if (isConnected && bluetoothGatt != null) {
                        val retryService = bluetoothGatt?.getService(SERVICE_UUID)
                        if (retryService != null && retryService.characteristics.isNotEmpty()) {
                            processCharacteristics(gatt)
                        } else {
                            Log.e(TAG, "❌ Characteristics still not available after retry")
                        }
                    }
                }, 200)
            }
        }
        
        override fun onCharacteristicRead(
            gatt: BluetoothGatt,
            characteristic: BluetoothGattCharacteristic,
            status: Int
        ) {
            // Not used, but required by interface
        }

        override fun onDescriptorWrite(
            gatt: BluetoothGatt,
            descriptor: BluetoothGattDescriptor,
            status: Int
        ) {
            if (status == BluetoothGatt.GATT_SUCCESS) {
                Log.d(TAG, "✅ Notification descriptor written successfully - ready to receive data")
                // Send event to JS to track notification setup success
                val eventMap = Arguments.createMap()
                eventMap.putString("status", "success")
                eventMap.putString("descriptorUuid", descriptor.uuid.toString())
                sendEvent("onNotificationEnabled", eventMap)
            } else {
                Log.e(TAG, "❌ Failed to write notification descriptor: $status")
                // Send error event to JS
                val eventMap = Arguments.createMap()
                eventMap.putString("status", "failed")
                eventMap.putInt("errorCode", status)
                eventMap.putString("descriptorUuid", descriptor.uuid.toString())
                sendEvent("onNotificationEnabled", eventMap)
            }
        }
        
        private fun processCharacteristics(gatt: BluetoothGatt) {
            // CRITICAL: Check connection state before processing
            if (!isConnected || bluetoothGatt == null) {
                Log.e(TAG, "❌ Connection lost before processing characteristics")
                return
            }
            
            val service = gatt.getService(SERVICE_UUID)
            if (service == null) {
                Log.e(TAG, "❌ Service not found, cannot process characteristics")
                // Retry after delay - service might not be ready yet
                mainHandler.postDelayed({
                    if (isConnected && bluetoothGatt != null) {
                        processCharacteristics(gatt)
                    }
                }, 500)
                return
            }
            
            // iOS: func peripheral(_:didDiscoverCharacteristicsFor:) - line 245
            // iOS line 231: characteristicUUIDs = [Self.rxCharacteristicUUID, Self.txCharacteristicUUID]
            // iOS expects both RX (000033F4) and TX (000033f3) characteristics
            Log.d(TAG, "✅ Processing characteristics (iOS protocol)")
            
            val characteristics = service.characteristics
            if (characteristics == null || characteristics.isEmpty()) {
                Log.w(TAG, "⚠️ No characteristics found, retrying...")
                // Retry after delay
                mainHandler.postDelayed({
                    if (isConnected && bluetoothGatt != null) {
                        processCharacteristics(gatt)
                    }
                }, 500) // Increased delay
                return
            }
            
            var foundWriteChar = false
            var foundNotifyChar = false
            
            // iOS line 254-295: Process all characteristics
            for (characteristic in characteristics) {
                val uuid = characteristic.uuid.toString()
                Log.d(TAG, "Characteristic UUID: $uuid")
                Log.d(TAG, "Properties: ${characteristic.properties}")
                
                // iOS line 269-277: Check write properties
                val hasWrite = (characteristic.properties and BluetoothGattCharacteristic.PROPERTY_WRITE) != 0
                val hasWriteNoResponse = (characteristic.properties and BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE) != 0
                
                if (hasWrite) {
                    Log.d(TAG, "✅ Safe to write with response: $uuid")
                } else if (hasWriteNoResponse) {
                    Log.d(TAG, "✅ Write without response: $uuid")
                }

                // iOS line 282: if characteristic.uuid == CBUUID(string: "33F3")
                // TX characteristic (000033f3) is for writing commands
                if (characteristic.uuid == TX_CHARACTERISTIC_UUID) {
                    writeCharacteristic = characteristic
                    foundWriteChar = true
                    Log.d(TAG, "✍️ Write Characteristic Found (TX): $uuid")
                }
                
                // iOS line 288: if characteristic.properties.contains(.notify) || characteristic.properties.contains(.indicate)
                // RX characteristic (000033F4) is for receiving notifications
                if (characteristic.properties and (BluetoothGattCharacteristic.PROPERTY_NOTIFY or BluetoothGattCharacteristic.PROPERTY_INDICATE) != 0) {
                    // iOS line 290: peripheral.setNotifyValue(true, for: characteristic)
                    notifyCharacteristic = characteristic
                    foundNotifyChar = true
                    
                    // CRITICAL: Check connection before enabling notifications
                    if (!isConnected || bluetoothGatt == null) {
                        Log.e(TAG, "❌ Connection lost before enabling notifications")
                        return
                    }
                    
                    // iOS: peripheral.setNotifyValue(true, for: characteristic) - line 290
                    val notifySuccess = gatt.setCharacteristicNotification(characteristic, true)
                    if (!notifySuccess) {
                        Log.e(TAG, "❌ Failed to enable notifications for $uuid")
                        // Retry after delay
                        mainHandler.postDelayed({
                            if (isConnected && bluetoothGatt != null) {
                                bluetoothGatt?.setCharacteristicNotification(characteristic, true)
                                val desc = characteristic.getDescriptor(
                                    UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")
                                )
                                desc?.let {
                                    it.value = BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
                                    bluetoothGatt?.writeDescriptor(it)
                                }
                            }
                        }, 500)
                        return
                    }
                    
                    // Enable notifications on the descriptor (Android requirement)
                    val descriptor = characteristic.getDescriptor(
                        UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")
                    )
                    if (descriptor != null) {
                        descriptor.value = BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
                        val writeSuccess = gatt.writeDescriptor(descriptor)
                        if (!writeSuccess) {
                            Log.e(TAG, "❌ Failed to write notification descriptor")
                            // Retry
                            mainHandler.postDelayed({
                                if (isConnected && bluetoothGatt != null) {
                                    descriptor.value = BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
                                    bluetoothGatt?.writeDescriptor(descriptor)
                                }
                            }, 500)
                        } else {
                            Log.d(TAG, "✅ Notification descriptor written for $uuid")
                        }
                    } else {
                        Log.w(TAG, "⚠️ Notification descriptor not found for $uuid")
                    }
                    
                    Log.d(TAG, "📡 Subscribed to notifications for $uuid (RX characteristic)")
                }
            }
            
            // iOS: Characteristics are processed here, but isConnected was already set in didConnect
            // Password will retry if characteristics aren't ready yet (iOS sendCommand returns early if not ready)
            if (foundWriteChar && foundNotifyChar) {
                Log.d(TAG, "✅ Protocol complete - TX and RX characteristics ready, password can be sent now")
            } else {
                if (!foundWriteChar) {
                    Log.w(TAG, "⚠️ TX write characteristic (000033f3) not found - password will retry")
                }
                if (!foundNotifyChar) {
                    Log.w(TAG, "⚠️ RX notify characteristic (000033F4) not found - notifications may not work")
                }
            }
        }

        override fun onCharacteristicWrite(
            gatt: BluetoothGatt,
            characteristic: BluetoothGattCharacteristic,
            status: Int
        ) {
            // iOS: func peripheral(_:didWriteValueFor:) - line 307
            if (status == BluetoothGatt.GATT_SUCCESS) {
                Log.d(TAG, "✅ Wrote to ${characteristic.uuid}")
            } else {
                Log.e(TAG, "❌ Write failed: $status for ${characteristic.uuid}")
                // CRITICAL: If write fails, connection might be unstable
                // Check if this is a critical write (password command)
                if (characteristic.uuid == TX_CHARACTERISTIC_UUID) {
                    Log.w(TAG, "⚠️ Password command write failed - connection may be unstable")
                    // Don't disconnect here - let the connection state callback handle it
                }
            }
        }

        override fun onCharacteristicChanged(
            gatt: BluetoothGatt,
            characteristic: BluetoothGattCharacteristic
        ) {
            // CRITICAL: Check connection state before processing data
            if (!isConnected || bluetoothGatt == null) {
                Log.w(TAG, "⚠️ Received data but connection is lost")
                return
            }
            
            // iOS: func peripheral(_:didUpdateValueFor:) - line 329
            val value = characteristic.value
            if (value != null) {
                val hexString = value.joinToString("") { "%02x".format(it) }
                Log.d(TAG, "📥 Received data: $hexString")
                
                val dataMap = Arguments.createMap()
                dataMap.putString("data", hexString)
                dataMap.putString("characteristicUuid", characteristic.uuid.toString())
                sendEvent("onDataReceived", dataMap)
            }
        }
    }
    
    // MARK: - Private Helper Methods (outside callback)
    
    private fun processCharacteristics(gatt: BluetoothGatt) {
        val service = gatt.getService(SERVICE_UUID) ?: return
        
        // iOS: func peripheral(_:didDiscoverCharacteristicsFor:) - line 245
        Log.d(TAG, "✅ Processing characteristics")
        
        val characteristics = service.characteristics
        for (characteristic in characteristics) {
            val uuid = characteristic.uuid.toString()
            Log.d(TAG, "Characteristic UUID: $uuid")
            Log.d(TAG, "Properties: ${characteristic.properties}")

            // iOS: if characteristic.uuid == CBUUID(string: "33F3") - line 282
            if (characteristic.uuid == TX_CHARACTERISTIC_UUID) {
                writeCharacteristic = characteristic
                Log.d(TAG, "✍️ Write Characteristic Found: $uuid")
            }

            // iOS: if characteristic.properties.contains(.notify) || characteristic.properties.contains(.indicate) - line 288
            if (characteristic.properties and (BluetoothGattCharacteristic.PROPERTY_NOTIFY or BluetoothGattCharacteristic.PROPERTY_INDICATE) != 0) {
                notifyCharacteristic = characteristic
                
                // iOS: peripheral.setNotifyValue(true, for: characteristic) - line 290
                gatt.setCharacteristicNotification(characteristic, true)
                
                // Enable notifications on the descriptor
                val descriptor = characteristic.getDescriptor(
                    UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")
                )
                if (descriptor != null) {
                    descriptor.value = BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
                    gatt.writeDescriptor(descriptor)
                }
                
                Log.d(TAG, "📡 Subscribed to notifications for $uuid")
            }
        }
    }
}

