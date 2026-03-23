// BLE Response Parser

/**
 * Parse 0x04 response (Power Bank Status)
 *
 * Protocol:
 * Byte 0: Command (0x04) - verified but not used in parsing
 * Byte 1-2: Case Battery Voltage (little-endian, LSB = 1mV)
 * Byte 3: Case Battery Percentage (0-100)
 * Byte 4: Status flags (bits for charging states)
 * Byte 5: Case Temperature (°C)
 * Byte 6: (unused)
 * Byte 7: Phone Battery % (confirmation, ignore)
 * Byte 8-9: Solar Current (little-endian, in mA)
 */
export const parsePowerBankStatus = (data) => {
  if (!data || data.length < 10) {
    console.error('❌ BLEParser: Invalid data length:', data?.length, 'Expected: >= 10');
    return null;
  }
  
  // Command byte safety check
  if (data[0] !== 0x04) {
    console.error('❌ BLEParser: Invalid command byte:', data[0]?.toString(16), 'Expected: 0x04');
    return null;
  }
  
  console.log('✅ BLEParser: Valid Power Bank Status data, length:', data.length);
  console.log('📥 BLEParser: Raw hex:', Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' '));
  
  const caseBatV = data[1] | (data[2] << 8);
  
  const caseBatPct = data[3];
  console.log('📊 BLEParser: caseBatPct =', caseBatPct, '%');
  
  const flags = data[4];
  console.log('📊 BLEParser: Flags byte (data[4]) =', '0x' + flags.toString(16).padStart(2, '0'), '=', flags.toString(2).padStart(8, '0'), '(binary)');
  
  const solarCharging = (flags & 0x01) !== 0;
  const usbCharging = (flags & 0x02) !== 0;
  const phoneCharging = (flags & 0x04) !== 0;
  const vcBelowMin = (flags & 0x08) !== 0;
  const vcAboveMax = (flags & 0x10) !== 0;
  const tcBelowMin = (flags & 0x20) !== 0;
  const tcAboveMax = (flags & 0x40) !== 0;
  
  console.log('🔌 BLEParser: USB Charging Status =', usbCharging, '(flags & 0x02 =', (flags & 0x02), ')');
  console.log('🔌 BLEParser: Phone Charging Status =', phoneCharging, '(flags & 0x04 =', (flags & 0x04), ')');
  console.log('🔌 BLEParser: Solar Charging Status =', solarCharging, '(flags & 0x01 =', (flags & 0x01), ')');
  
  // Always return in Celsius - conversion happens at display time
  const caseTemp = data[5];
  console.log('📊 BLEParser: caseTemp (raw) =', caseTemp, '°C');
  
  const phBatPct = data[7];
  
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
    flags,              // Raw flags byte for debugging
  };
  
  console.log('✅ BLEParser: Parsed result:', JSON.stringify(result, null, 2));
  console.log('🔌 BLEParser: USB Status Summary:', {
    flagsByte: '0x' + flags.toString(16).padStart(2, '0'),
    flagsBinary: flags.toString(2).padStart(8, '0'),
    usbBit: (flags & 0x02) !== 0,
    usbCharging: result.usbCharging,
    phoneCharging: result.phoneCharging,
    solarCharging: result.solarCharging,
  });
  
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

/**
 * Parse 0x03 response (Charger Config)
 *
 * Protocol (from Command 0x02 format):
 * Byte 0: Command (0x03) - verified but not used in parsing
 * Byte 1-2: MaxChgV, unit % (little-endian, default 80%)
 * Byte 3-4: MinChgV, unit % (little-endian, default 20%)
 * Byte 5: EnPhCharger (0=off, 1=on, 2=auto)
 * Byte 6: EnSolar (0=off, 1=on, 2=auto)
 * Byte 7: EnUSBCharging (0=off, 1=on, 2=auto)
 * Byte 8: Update period (NN - display rate in seconds, 0=default 5 seconds)
 * Byte 17-18: Charge Data Update Times (RR SS - little-endian, default 3600 seconds)
 */
export const parseChargerConfig = (data) => {
  if (!data || data.length < 19) {
    console.error('❌ BLEParser: Invalid ChargerConfig data length:', data?.length, 'Expected: >= 19');
    return null;
  }
  
  // Command byte safety check
  if (data[0] !== 0x03) {
    console.error('❌ BLEParser: Invalid command byte:', data[0]?.toString(16), 'Expected: 0x03');
    return null;
  }
  
  console.log('✅ BLEParser: Valid ChargerConfig data, length:', data.length);
  console.log('📥 BLEParser: Raw hex:', Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' '));
  
  // Parse according to Command 0x02 format
  const maxChgV = data[1] | (data[2] << 8); // AA BB - little-endian
  const minChgV = data[3] | (data[4] << 8); // CC DD - little-endian
  const enPhCharger = data[5]; // EE - 0=off, 1=on, 2=auto
  const enSolar = data[6]; // FF - 0=off, 1=on, 2=auto
  const enUSBCharging = data[7]; // GG - 0=off, 1=on, 2=auto
  const period = data[13]; // NN - update period in seconds (0=default 5 seconds)
  const chargeUpdate = data[17] | (data[18] << 8); // RR SS - little-endian, in seconds (default 3600)
  
  const result = {
    maxChgV,           // Max charge voltage (%)
    minChgV,           // Min charge voltage (%)
    enPhCharger,       // Enable phone charging (0=off, 1=on, 2=auto)
    enSolar,           // Enable solar (0=off, 1=on, 2=auto)
    enUSBCharging,     // Enable USB charging (0=off, 1=on, 2=auto)
    period,            // Update period (seconds, 0=default 5)
    chargeUpdate,      // Charge data update times (seconds, default 3600)
  };
  
  console.log('✅ BLEParser: Parsed ChargerConfig:', JSON.stringify(result, null, 2));
  
  return result;
};






