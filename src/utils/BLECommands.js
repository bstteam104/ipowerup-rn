// BLE Commands - Exact from iOS BLECommand.swift

/**
 * Create password command
 * iOS: [0x19, 0x88, 0x88, 0x88]
 */
export const createPasswordCommand = () => {
  return Buffer.from([0x19, 0x88, 0x88, 0x88]);
};

/**
 * Create query power bank status command
 * iOS: 0x04 + phone battery % (2 bytes little-endian) + padding
 * @param {number} phoneBatteryPercent - Phone battery level (0-100)
 */
export const createQueryPowerBankStatusCommand = (phoneBatteryPercent) => {
  // Clamp between 0-100
  const battery = Math.max(0, Math.min(100, Math.round(phoneBatteryPercent)));
  
  // Create 20-byte buffer
  const command = Buffer.alloc(20, 0x00);
  
  // Byte 0: Command type (0x04)
  command[0] = 0x04;
  
  // Byte 1-6: 0x00 (padding) - already set
  
  // Byte 7-8: Phone battery percentage (little-endian)
  command.writeUInt16LE(battery, 7);
  
  // Byte 9-19: 0x00 (padding) - already set
  
  return command;
};

/**
 * Create query charger config status command
 * iOS: [0x03]
 */
export const createQueryChargerConfigCommand = () => {
  const command = Buffer.alloc(20, 0x00);
  command[0] = 0x03;
  return command;
};

/**
 * Create history phone charging command
 * iOS: [0x07]
 */
export const createHistoryPhoneChargingCommand = () => {
  const command = Buffer.alloc(20, 0x00);
  command[0] = 0x07;
  return command;
};

/**
 * Create history USB charging command
 * iOS: [0x06]
 */
export const createHistoryUSBChargingCommand = () => {
  const command = Buffer.alloc(20, 0x00);
  command[0] = 0x06;
  return command;
};

/**
 * Create history solar charging command
 * iOS: [0x05]
 */
export const createHistorySolarChargingCommand = () => {
  const command = Buffer.alloc(20, 0x00);
  command[0] = 0x05;
  return command;
};

/**
 * Create today status command
 * iOS: [0x08]
 */
export const createTodayStatusCommand = () => {
  const command = Buffer.alloc(20, 0x00);
  command[0] = 0x08;
  return command;
};

/**
 * Create enable phone charging command
 * iOS: [0x21]
 */
export const createEnablePhoneChargingCommand = () => {
  const command = Buffer.alloc(20, 0x00);
  command[0] = 0x21;
  return command;
};

/**
 * Create stop charging command
 * iOS: [0x18]
 */
export const createStopChargingCommand = () => {
  const command = Buffer.alloc(20, 0x00);
  command[0] = 0x18;
  return command;
};






