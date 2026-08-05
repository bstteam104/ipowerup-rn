/**
 * Persists BLE energy history like iOS `BLEHistoryStorage` + `BatteryDataManager.getChartData`.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  parseBatteryHistory,
  parseBatteryTodayHistory,
} from '../utils/bleHistoryParser';

export const HISTORY_KEYS = {
  phone: 'phoneChargingHistory',
  usb: 'usbChargingHistory',
  solar: 'solarChargingHistory',
};

const RECORDED_HISTORY_KEY = '@ipowerup:recordedHistoryData';

const startOfLocalDayMs = ts => {
  const x = new Date(ts);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
};

const sameLocalCalendarDay = (aTs, bTs) =>
  startOfLocalDayMs(aTs) === startOfLocalDayMs(bTs);

const sortHistoryDesc = list =>
  [...list].sort((a, b) => (b.date || 0) - (a.date || 0));

export const getRecordedHistoryData = async () => {
  try {
    const raw = await AsyncStorage.getItem(RECORDED_HISTORY_KEY);
    return raw === 'true';
  } catch {
    return false;
  }
};

export const setRecordedHistoryData = async value => {
  try {
    await AsyncStorage.setItem(RECORDED_HISTORY_KEY, value ? 'true' : 'false');
  } catch (e) {}
};

/** iOS AppDelegate + disconnect — wipe stale rows before fresh device fetch. */
export const clearAllBleHistory = async () => {
  try {
    await AsyncStorage.multiRemove([
      HISTORY_KEYS.phone,
      HISTORY_KEYS.usb,
      HISTORY_KEYS.solar,
      RECORDED_HISTORY_KEY,
    ]);
  } catch (e) {}
};

export const getBleHistory = async typeKey => {
  try {
    const raw = await AsyncStorage.getItem(typeKey);
    if (!raw) {
      return [];
    }
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? sortHistoryDesc(arr) : [];
  } catch {
    return [];
  }
};

export const saveBleHistory = async (typeKey, list) => {
  try {
    await AsyncStorage.setItem(typeKey, JSON.stringify(sortHistoryDesc(list)));
    return true;
  } catch {
    return false;
  }
};

/** iOS `fetchAndSaveHistory` — merge device payload with saved same-day rows (today from 0x08). */
export const mergeFetchedHistory = async (typeKey, rawHex) => {
  let parsed = parseBatteryHistory(rawHex, rawHex);
  const saved = await getBleHistory(typeKey);

  for (const savedEntry of saved) {
    const idx = parsed.findIndex(p => sameLocalCalendarDay(p.date, savedEntry.date));
    if (idx >= 0) {
      parsed[idx] = savedEntry;
    }
  }
  await saveBleHistory(typeKey, parsed);
};

/** iOS `saveTodayHistoryData` — replace same calendar day or append. */
export const saveTodayHistoryEntry = async (typeKey, today) => {
  let history = await getBleHistory(typeKey);
  const idx = history.findIndex(h => sameLocalCalendarDay(h.date, today.date));
  if (idx >= 0) {
    history[idx] = today;
  } else {
    history.push(today);
  }
  await saveBleHistory(typeKey, history);
};

export const mergeTodayFromStatus08 = async rawHex => {
  const history = parseBatteryTodayHistory(rawHex, rawHex);
  if (history[0]) {
    await saveTodayHistoryEntry(HISTORY_KEYS.solar, history[0]);
  }
  if (history.length >= 2) {
    await saveTodayHistoryEntry(HISTORY_KEYS.usb, history[1]);
  }
  const phoneToday = history.length ? history[history.length - 1] : null;
  if (phoneToday) {
    await saveTodayHistoryEntry(HISTORY_KEYS.phone, phoneToday);
  }
};

const normalize = (values, maxValue) => {
  const max = maxValue != null ? maxValue : Math.max(...values, 0);
  if (!max || max <= 0) {
    return values.map(() => 0);
  }
  return values.map(v => v / max);
};

const weekdayLetter = ts => {
  const fmt = new Intl.DateTimeFormat(undefined, {weekday: 'short'});
  return fmt.format(new Date(ts)).charAt(0);
};

/**
 * iOS `BatteryDataManager.getChartData(for: 10)` — same zip, labels, rotate (no zero padding).
 */
export const getChartDataFromBleHistory = async () => {
  let phoneCharging = (await getBleHistory(HISTORY_KEYS.phone)).map(e => e.mWhValue || 0);
  let usbCharging = (await getBleHistory(HISTORY_KEYS.usb)).map(e => e.mWhValue || 0);
  let usbSolar = (await getBleHistory(HISTORY_KEYS.solar)).map(e => e.mWhValue || 0);

  if (phoneCharging.length === 0) {
    return {caseData: [], phoneData: [], dayLabels: [], hasBleData: false};
  }

  const usbMax = Math.max(...usbCharging, 0);
  const solarMax = Math.max(...usbSolar, 0);
  if (solarMax > usbMax) {
    usbSolar = normalize(usbSolar);
    usbCharging = normalize(usbCharging, solarMax);
  } else {
    usbSolar = normalize(usbSolar, usbMax);
    usbCharging = normalize(usbCharging);
  }

  phoneCharging = normalize(phoneCharging);

  const len = Math.min(phoneCharging.length, usbCharging.length, usbSolar.length);
  if (len === 0) {
    return {caseData: [], phoneData: [], dayLabels: [], hasBleData: false};
  }

  const caseData = [];
  const phoneData = [];
  const dayLabels = [];

  let dayCount = 9;
  for (let i = 0; i < len; i++) {
    const ph = phoneCharging[i];
    const usb = usbCharging[i];
    const sol = usbSolar[i];
    caseData.push({wallOutlet: ph, unoCase: ph});
    phoneData.push({wallOutlet: sol, unoCase: usb});
    dayLabels.push(weekdayLetter(Date.now() - dayCount * 86400000));
    dayCount -= 1;
  }

  if (caseData.length > 0) {
    caseData.push(caseData.shift());
    phoneData.push(phoneData.shift());
  }

  return {caseData, phoneData, dayLabels, hasBleData: true};
};
