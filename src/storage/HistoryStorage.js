// History Storage - AsyncStorage helper
import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_KEY = 'chargingHistory';
const MAX_HISTORY_ITEMS = 100; // Keep last 100 entries

/**
 * Save charging history entry
 */
export const saveHistoryEntry = async (entry) => {
  try {
    const existing = await AsyncStorage.getItem(HISTORY_KEY);
    const history = existing ? JSON.parse(existing) : [];
    
    const newEntry = {
      timestamp: Date.now(),
      phoneBattery: entry.phoneBattery || 0,
      caseBattery: entry.caseBattery || 0,
      temperature: entry.temperature || 0,
      phoneCharging: entry.phoneCharging || false,
      solarCurrent: entry.solarCurrent || 0,
    };
    
    history.push(newEntry);
    
    // Keep only last MAX_HISTORY_ITEMS
    if (history.length > MAX_HISTORY_ITEMS) {
      history.splice(0, history.length - MAX_HISTORY_ITEMS);
    }
    
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    return true;
  } catch (error) {
    console.error('Error saving history:', error);
    return false;
  }
};

/**
 * Get charging history
 */
export const getHistory = async () => {
  try {
    const history = await AsyncStorage.getItem(HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error('Error getting history:', error);
    return [];
  }
};

/**
 * Clear history
 */
export const clearHistory = async () => {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing history:', error);
    return false;
  }
};

/**
 * Save last connected device ID
 */
export const saveLastConnectedDevice = async (deviceId) => {
  try {
    await AsyncStorage.setItem('lastConnectedDevice', deviceId);
    return true;
  } catch (error) {
    console.error('Error saving device ID:', error);
    return false;
  }
};

/**
 * Get last connected device ID
 */
export const getLastConnectedDevice = async () => {
  try {
    return await AsyncStorage.getItem('lastConnectedDevice');
  } catch (error) {
    console.error('Error getting device ID:', error);
    return null;
  }
};






