// BLE Response Parser
// Protocol matches iOS PowerBankStatus.swift exactly

/**
 * Parse 0x04 response (Power Bank Status)
 * 
 * Protocol (iOS PowerBankStatus.swift line 31-61):
 * Byte 0: Command (0x04) - verified but not used in parsing
 * Byte 1-2: Case Battery Voltage (little-endian, LSB = 1mV)
 * Byte 3: Case Battery Percentage (0-100)
 * Byte 4: Status flags (bits for charging states)
 * Byte 5: Case Temperature (°C)
 * Byte 6: (unused in iOS)
 * Byte 7: Phone Battery % (confirmation, ignore)
 * Byte 8-9: Solar Current (little-endian, in mA)
 * 
 * iOS parsing (PowerBankStatus.swift):
 * - caseBatV = Int(data[1]) | (Int(data[2]) << 8)
 * - caseBatPct = Int(data[3])
 * - flags = data[4]
 * - caseTemp = Double(data[5])
 * - phBatPct = Int(data[7])
 * - solarCurr = Int(data[8]) | (Int(data[9]) << 8)
 */
export const parsePowerBankStatus = (data, temperatureUnit = 'celsius') => {
  // iOS: guard data.count >= 10 else { return } - line 32
  if (!data || data.length < 10) {
    console.error('❌ BLEParser: Invalid data length:', data?.length, 'Expected: >= 10');
    return null;
  }
  
  // iOS doesn't check command byte in parse(), but we do for safety
  // iOS: command is verified in didReceiveData before calling PowerBankStatus(hexString:)
  if (data[0] !== 0x04) {
    console.error('❌ BLEParser: Invalid command byte:', data[0]?.toString(16), 'Expected: 0x04');
    return null;
  }
  
  console.log('✅ BLEParser: Valid Power Bank Status data, length:', data.length);
  console.log('📥 BLEParser: Raw hex:', Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' '));
  
  // iOS line 35: caseBatV = Int(data[1]) | (Int(data[2]) << 8)
  const caseBatV = data[1] | (data[2] << 8);
  
  // iOS line 38: caseBatPct = Int(data[3])
  const caseBatPct = data[3];
  console.log('📊 BLEParser: caseBatPct =', caseBatPct, '%');
  
  // iOS line 41: let flags = data[4]
  const flags = data[4];
  // iOS line 42-48: flag parsing
  const solarCharging = (flags & 0x01) !== 0;
  const usbCharging = (flags & 0x02) !== 0;
  const phoneCharging = (flags & 0x04) !== 0;
  const vcBelowMin = (flags & 0x08) !== 0;
  const vcAboveMax = (flags & 0x10) !== 0;
  const tcBelowMin = (flags & 0x20) !== 0;
  const tcAboveMax = (flags & 0x40) !== 0;
  
  // iOS line 51: caseTemp = Double(data[5])
  let caseTemp = data[5];
  console.log('📊 BLEParser: caseTemp (raw) =', caseTemp, '°C');
  
  // iOS line 52-54: Convert to Fahrenheit if needed
  if (temperatureUnit === 'fahrenheit') {
    caseTemp = (caseTemp * 9.0 / 5.0) + 32.0;
    console.log('📊 BLEParser: caseTemp (converted) =', caseTemp, '°F');
  }
  
  // iOS line 57: phBatPct = Int(data[7])
  const phBatPct = data[7];
  
  // iOS line 60: solarCurr = Int(data[8]) | (Int(data[9]) << 8)
  const solarCurr = data[8] | (data[9] << 8);
  
  const result = {
    caseBatV,           // Case battery voltage (mV)
    caseBatPct,         // Case battery percentage (0-100)
    solarCharging,      // Solar charging status
    usbCharging,        // USB charging status
    phoneCharging,      // Phone charging status
    vcBelowMin,         // Voltage below minimum
    vcAboveMax,         // Voltage above maximum
    tcBelowMin,         // Temperature below minimum
    tcAboveMax,         // Temperature above maximum
    caseTemp,           // Case temperature (°C or °F)
    phBatPct,           // Phone battery % (confirmation, ignore)
    solarCurr,          // Solar current (mA)
  };
  
  console.log('✅ BLEParser: Parsed result:', JSON.stringify(result, null, 2));
  return result;
};

/**
 * Convert hex string to Buffer
 */
export const hexStringToBuffer = (hexString) => {
  let hex = hexString.replace(/0x/gi, '');
  if (hex.length % 2 !== 0) {
    hex = '0' + hex;
  }
  
  const bytes = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substr(i, 2), 16));
  }
  
  return Buffer.from(bytes);
};

/**
 * Convert Buffer to hex string
 */
export const bufferToHexString = (buffer) => {
  return Array.from(buffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};






