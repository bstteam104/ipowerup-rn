/**
 * BLE history hex parsing — mirrors iOS `BLEHistoryStorage` (cleanHex, parseBatteryHistory, parseBatteryTodayHistory).
 */

const MS_PER_DAY = 86400000;

export const cleanHistoryHex = hex => {
  let result = String(hex || '')
    .trim()
    .replace(/^0x/i, '');

  if (
    result.startsWith('05') ||
    result.startsWith('06') ||
    result.startsWith('07') ||
    result.startsWith('08')
  ) {
    result = result.slice(2);
  }

  return result;
};

const hexToBytes = hexStr => {
  const bytes = [];
  for (let i = 0; i < hexStr.length; i += 2) {
    const pair = hexStr.slice(i, i + 2);
    if (pair.length < 2) {
      break;
    }
    bytes.push(parseInt(pair, 16) || 0);
  }
  return bytes;
};

/** @returns {{firstHex: string, secondHex: string, completeHex: string, hexPairValue: number, message: string, date: number, mWhValue: number}[]} */
export const parseBatteryHistory = (hex, completeHex = '') => {
  const hexStr = cleanHistoryHex(hex);
  const bytes = hexToBytes(hexStr);
  const entries = [];
  const now = Date.now();

  for (let i = 0; i + 1 < bytes.length; i += 2) {
    const day = Math.floor(i / 2) + 1;
    const low = bytes[i];
    const high = bytes[i + 1];
    const value = low | (high << 8);
    const date = now - day * MS_PER_DAY;
    entries.push({
      firstHex: low.toString(16).padStart(2, '0').toUpperCase(),
      secondHex: high.toString(16).padStart(2, '0').toUpperCase(),
      completeHex: completeHex || hex,
      hexPairValue: value / 100,
      message: `History value ${value}`,
      date,
      mWhValue: value / 1000,
    });
  }

  return entries.reverse();
};

/** First 6 bytes (3 x u16 LE) as today triple — order: [0]=solar, [1]=usb, [last]=phone (iOS HomeVC). */
export const parseBatteryTodayHistory = (hex, completeHex = '') => {
  const historyHex = cleanHistoryHex(hex);
  const prefix = historyHex.slice(0, 12);
  const bytes = hexToBytes(prefix);
  const entries = [];
  const now = Date.now();

  for (let i = 0; i + 1 < bytes.length; i += 2) {
    const low = bytes[i];
    const high = bytes[i + 1];
    const value = low | (high << 8);
    entries.push({
      firstHex: low.toString(16).padStart(2, '0').toUpperCase(),
      secondHex: high.toString(16).padStart(2, '0').toUpperCase(),
      completeHex: completeHex || hex,
      hexPairValue: value / 100,
      message: `History value ${value}`,
      date: now,
      mWhValue: value / 1000,
    });
  }
  return entries;
};
