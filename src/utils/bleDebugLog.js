import AsyncStorage from '@react-native-async-storage/async-storage';

export const BLE_DEBUG_LOG_KEY = '@ipowerup:ble_debug_logs';
const MAX_BLE_DEBUG_LOGS = 300;

export const addBleDebugLog = async (type, message, data = {}) => {
  const entry = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    type,
    message,
    data,
  };

  try {
    const existing = await AsyncStorage.getItem(BLE_DEBUG_LOG_KEY);
    const parsed = existing ? JSON.parse(existing) : [];
    const current = Array.isArray(parsed) ? parsed : [];
    const next = [entry, ...current].slice(0, MAX_BLE_DEBUG_LOGS);
    await AsyncStorage.setItem(BLE_DEBUG_LOG_KEY, JSON.stringify(next));
    return entry;
  } catch (error) {
    console.error('Failed to save BLE debug log:', error);
    return entry;
  }
};

export const getBleDebugLogs = async () => {
  try {
    const raw = await AsyncStorage.getItem(BLE_DEBUG_LOG_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to load BLE debug logs:', error);
    return [];
  }
};
