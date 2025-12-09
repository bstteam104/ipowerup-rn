// BLE Response Parser

/**
 * Parse 0x04 response (Power Bank Status)
 * 
 * Response format:
 * Byte 0: Command (0x04)
 * Byte 1-2: Case Battery Voltage (little-endian, LSB = 1mV)
 * Byte 3: Case Battery Percentage (0-100)
 * Byte 4: Status flags (bits for charging states)
 * Byte 5: Case Temperature (°C)
 * Byte 7: Phone Battery % (confirmation, ignore)
 * Byte 8-9: Solar Current (little-endian, in mA)
 */
export const parsePowerBankStatus = (data, temperatureUnit = 'celsius') => {
  if (!data || data.length < 10) {
    return null;
  }
  
  // Check command type
  if (data[0] !== 0x04) {
    return null;
  }
  
  // Byte 1-2: Case Battery Voltage (Little Endian)
  const caseBatV = data[1] | (data[2] << 8);
  
  // Byte 3: Case Battery Percentage
  const caseBatPct = data[3];
  
  // Byte 4: Status flags
  const flags = data[4];
  const solarCharging = (flags & 0x01) !== 0;
  const usbCharging = (flags & 0x02) !== 0;
  const phoneCharging = (flags & 0x04) !== 0;
  const vcBelowMin = (flags & 0x08) !== 0;
  const vcAboveMax = (flags & 0x10) !== 0;
  const tcBelowMin = (flags & 0x20) !== 0;
  const tcAboveMax = (flags & 0x40) !== 0;
  
  // Byte 5: Case Temperature (°C)
  let caseTemp = data[5];
  
  // Convert to Fahrenheit if needed
  if (temperatureUnit === 'fahrenheit') {
    caseTemp = (caseTemp * 9.0 / 5.0) + 32.0;
  }
  
  // Byte 7: Phone Battery % (confirmation - we ignore this, get from phone)
  const phBatPct = data[7];
  
  // Byte 8-9: Solar Current (Little Endian)
  const solarCurr = data[8] | (data[9] << 8);
  
  return {
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






