/**
 * Local notification history — active alerts clear when condition fixes or user acts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {DeviceEventEmitter} from 'react-native';

const STORAGE_KEY = '@ipowerup:notification_history';
export const NOTIFICATION_HISTORY_UPDATED = 'notificationHistoryUpdated';

export const ALERT_KEYS = {
  CASE_BAND_LOW: 'case_band_low',
  CASE_BAND_HIGH: 'case_band_high',
  CASE_CRITICAL_MIN: 'case_critical_min',
  CASE_CRITICAL_MAX: 'case_critical_max',
  TEMP_LOW: 'temp_low',
  TEMP_HIGH: 'temp_high',
  PHONE_LOW: 'phone_low',
};

export const NOTIFICATION_STATUS = {
  ACTIVE: 'active',
  RESOLVED: 'resolved',
};

const emitUpdated = () => {
  DeviceEventEmitter.emit(NOTIFICATION_HISTORY_UPDATED);
};

const sortDesc = list =>
  [...list].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

const makeId = () =>
  `n_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

export const formatNotificationDate = ts => {
  const date = new Date(ts);
  const now = new Date();
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const startYesterday = new Date(startToday);
  startYesterday.setDate(startYesterday.getDate() - 1);

  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  const h12 = hours % 12 || 12;
  const minStr = minutes < 10 ? `0${minutes}` : String(minutes);
  const timeStr = `${h12}:${minStr} ${ampm}`;

  if (date >= startToday) {
    return `today at ${timeStr}`;
  }
  if (date >= startYesterday) {
    return `yesterday at ${timeStr}`;
  }
  return `${date.toLocaleDateString()} at ${timeStr}`;
};

const getAlertImageForKey = alertKey => {
  if (
    alertKey === ALERT_KEYS.CASE_BAND_HIGH ||
    alertKey === ALERT_KEYS.CASE_CRITICAL_MAX
  ) {
    return 'alert2';
  }
  if (alertKey === ALERT_KEYS.TEMP_LOW || alertKey === ALERT_KEYS.TEMP_HIGH) {
    return 'alert3';
  }
  return 'alert1';
};

const getActionForKey = alertKey => {
  switch (alertKey) {
    case ALERT_KEYS.PHONE_LOW:
      return 'transfer_power';
    case ALERT_KEYS.CASE_BAND_HIGH:
    case ALERT_KEYS.CASE_CRITICAL_MAX:
      return 'stop_charging';
    default:
      return 'none';
  }
};

const readAll = async () => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeAll = async list => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    emitUpdated();
    return true;
  } catch {
    return false;
  }
};

export const getActiveNotifications = async () => {
  const all = await readAll();
  return sortDesc(all.filter(n => n.status === NOTIFICATION_STATUS.ACTIVE));
};

export const getNotificationById = async id => {
  const all = await readAll();
  return all.find(n => n.id === id) || null;
};

export const hasActiveNotifications = async () => {
  const active = await getActiveNotifications();
  return active.length > 0;
};

/**
 * Upsert one active alert per alertKey (no duplicate rows for same condition).
 */
export const upsertActiveNotification = async ({
  alertKey,
  title,
  body,
  level = null,
}) => {
  if (!alertKey || !title) {
    return null;
  }

  const all = await readAll();
  const now = Date.now();
  const existingIdx = all.findIndex(
    n => n.alertKey === alertKey && n.status === NOTIFICATION_STATUS.ACTIVE,
  );

  const entry = {
    id: existingIdx >= 0 ? all[existingIdx].id : makeId(),
    alertKey,
    title,
    body: body || '',
    level,
    action: getActionForKey(alertKey),
    alertImage: getAlertImageForKey(alertKey),
    status: NOTIFICATION_STATUS.ACTIVE,
    createdAt: existingIdx >= 0 ? all[existingIdx].createdAt : now,
    updatedAt: now,
  };

  if (existingIdx >= 0) {
    all[existingIdx] = entry;
  } else {
    all.unshift(entry);
  }

  await writeAll(all);
  return entry;
};

export const resolveNotification = async (id, reason = 'user_action') => {
  const all = await readAll();
  const idx = all.findIndex(n => n.id === id);
  if (idx < 0) {
    return false;
  }
  all[idx] = {
    ...all[idx],
    status: NOTIFICATION_STATUS.RESOLVED,
    resolvedAt: Date.now(),
    resolvedReason: reason,
  };
  await writeAll(all);
  return true;
};

export const resolveByAlertKeys = async (alertKeys, reason = 'auto') => {
  if (!alertKeys?.length) {
    return;
  }
  const keySet = new Set(alertKeys);
  const all = await readAll();
  let changed = false;
  const next = all.map(n => {
    if (n.status === NOTIFICATION_STATUS.ACTIVE && keySet.has(n.alertKey)) {
      changed = true;
      return {
        ...n,
        status: NOTIFICATION_STATUS.RESOLVED,
        resolvedAt: Date.now(),
        resolvedReason: reason,
      };
    }
    return n;
  });
  if (changed) {
    await writeAll(next);
  }
};

/**
 * Auto-clear when telemetry shows the underlying condition is fixed.
 */
export const autoResolveFromTelemetry = async ({
  caseBatPct,
  phoneBatPct,
  phoneCharging,
  vcBelowMin,
  vcAboveMax,
  tcBelowMin,
  tcAboveMax,
}) => {
  const toResolve = [];

  if (typeof caseBatPct === 'number') {
    if (caseBatPct > 20) {
      toResolve.push(ALERT_KEYS.CASE_BAND_LOW, ALERT_KEYS.CASE_CRITICAL_MIN);
    }
    if (caseBatPct < 80) {
      toResolve.push(ALERT_KEYS.CASE_BAND_HIGH, ALERT_KEYS.CASE_CRITICAL_MAX);
    }
  }

  if (!vcBelowMin) {
    toResolve.push(ALERT_KEYS.CASE_CRITICAL_MIN);
  }
  if (!vcAboveMax) {
    toResolve.push(ALERT_KEYS.CASE_CRITICAL_MAX);
  }
  if (!tcBelowMin) {
    toResolve.push(ALERT_KEYS.TEMP_LOW);
  }
  if (!tcAboveMax) {
    toResolve.push(ALERT_KEYS.TEMP_HIGH);
  }

  if (typeof phoneBatPct === 'number' && (phoneBatPct > 20 || phoneCharging)) {
    toResolve.push(ALERT_KEYS.PHONE_LOW);
  }

  await resolveByAlertKeys([...new Set(toResolve)], 'auto');
};

export const clearNotificationHistory = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    emitUpdated();
  } catch (e) {}
};
