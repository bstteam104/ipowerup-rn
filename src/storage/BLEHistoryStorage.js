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

const startOfLocalDayMs = ts => {
  const x = new Date(ts);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
};

const sameLocalCalendarDay = (aTs, bTs) =>
  startOfLocalDayMs(aTs) === startOfLocalDayMs(bTs);

const sortHistoryDesc = list =>
  [...list].sort((a, b) => (b.date || 0) - (a.date || 0));

export const getBleHistory = async typeKey => {
  try {
    const raw = await AsyncStorage.getItem(typeKey);
    if (!raw) {
      return [];
    }
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

export const saveBleHistory = async (typeKey, list) => {
  try {
    await AsyncStorage.setItem(typeKey, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
};

/** iOS `fetchAndSaveHistory` — merge device payload with saved same-day rows. */
export const mergeFetchedHistory = async (typeKey, rawHex) => {
  let parsed = parseBatteryHistory(rawHex, rawHex);
  const saved = await getBleHistory(typeKey);

  for (const savedEntry of saved) {
    const idx = parsed.findIndex(p => sameLocalCalendarDay(p.date, savedEntry.date));
    if (idx >= 0) {
      parsed[idx] = savedEntry;
    } else {
      parsed.push(savedEntry);
    }
  }
  parsed = sortHistoryDesc(parsed);
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
  history = sortHistoryDesc(history);
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
 * Same pairing as iOS `BatteryDataManager.getChartData` + rotate first→last,
 * then pad/trim to `targetDays` bars for RN charts.
 */
export const getChartDataFromBleHistory = async (targetDays = 10) => {
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

  // iOS: dayCount = 9, decrement each iteration (same as Swift getChartData)
  let dayCount = targetDays - 1;
  for (let i = 0; i < len; i++) {
    const ph = phoneCharging[i];
    const usb = usbCharging[i];
    const sol = usbSolar[i];
    caseData.push({wallOutlet: ph, unoCase: ph});
    phoneData.push({wallOutlet: sol, unoCase: usb});
    dayLabels.push(weekdayLetter(Date.now() - dayCount * 86400000));
    dayCount--;
  }

  // iOS rotates data only — labels stay sequential
  if (caseData.length > 0) {
    const c0 = caseData.shift();
    caseData.push(c0);
    const p0 = phoneData.shift();
    phoneData.push(p0);
  }

  while (caseData.length < targetDays) {
    const padIdx = targetDays - caseData.length;
    const date = Date.now() - (targetDays - 1 + padIdx) * 86400000;
    caseData.unshift({wallOutlet: 0, unoCase: 0});
    phoneData.unshift({wallOutlet: 0, unoCase: 0});
    dayLabels.unshift(weekdayLetter(date));
  }
  if (caseData.length > targetDays) {
    const drop = caseData.length - targetDays;
    caseData.splice(0, drop);
    phoneData.splice(0, drop);
    dayLabels.splice(0, drop);
  }

  return {caseData, phoneData, dayLabels, hasBleData: true};
};
