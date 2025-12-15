package com.ipowerupreactnative

import android.app.Activity
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments

class BluetoothModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    private val REQUEST_ENABLE_BT = 1
    private var enableBluetoothPromise: Promise? = null
    
    private val activityEventListener: ActivityEventListener = object : BaseActivityEventListener() {
        override fun onActivityResult(activity: Activity?, requestCode: Int, resultCode: Int, intent: Intent?) {
            if (requestCode == REQUEST_ENABLE_BT) {
                if (resultCode == Activity.RESULT_OK) {
                    enableBluetoothPromise?.resolve(true)
                } else {
                    enableBluetoothPromise?.reject("BLUETOOTH_DISABLED", "User denied Bluetooth enable request")
                }
                enableBluetoothPromise = null
            }
        }
    }
    
    init {
        reactContext.addActivityEventListener(activityEventListener)
    }
    
    override fun getName(): String {
        return "BluetoothModule"
    }
    
    @ReactMethod
    fun getBluetoothState(promise: Promise) {
        try {
            val bluetoothManager = reactApplicationContext.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
            val bluetoothAdapter = bluetoothManager.adapter
            
            if (bluetoothAdapter == null) {
                promise.resolve("Unsupported")
                return
            }
            
            when (bluetoothAdapter.state) {
                BluetoothAdapter.STATE_OFF -> promise.resolve("PoweredOff")
                BluetoothAdapter.STATE_ON -> promise.resolve("PoweredOn")
                BluetoothAdapter.STATE_TURNING_ON -> promise.resolve("PoweringOn")
                BluetoothAdapter.STATE_TURNING_OFF -> promise.resolve("PoweringOff")
                else -> promise.resolve("Unknown")
            }
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to get Bluetooth state: ${e.message}", e)
        }
    }
    
    @ReactMethod
    fun requestEnableBluetooth(promise: Promise) {
        try {
            val bluetoothManager = reactApplicationContext.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
            val bluetoothAdapter = bluetoothManager.adapter
            
            if (bluetoothAdapter == null) {
                promise.reject("UNSUPPORTED", "Bluetooth is not supported on this device")
                return
            }
            
            if (bluetoothAdapter.isEnabled) {
                promise.resolve(true)
                return
            }
            
            val currentActivity = currentActivity
            if (currentActivity == null) {
                promise.reject("NO_ACTIVITY", "No current activity available")
                return
            }
            
            enableBluetoothPromise = promise
            val enableBtIntent = Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE)
            currentActivity.startActivityForResult(enableBtIntent, REQUEST_ENABLE_BT)
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to request Bluetooth enable: ${e.message}", e)
        }
    }
    
    @ReactMethod
    fun isBluetoothEnabled(promise: Promise) {
        try {
            val bluetoothManager = reactApplicationContext.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
            val bluetoothAdapter = bluetoothManager.adapter
            
            if (bluetoothAdapter == null) {
                promise.resolve(false)
                return
            }
            
            promise.resolve(bluetoothAdapter.isEnabled)
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to check Bluetooth state: ${e.message}", e)
        }
    }
}






