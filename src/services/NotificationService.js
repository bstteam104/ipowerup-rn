import notifee, {AndroidImportance, AuthorizationStatus} from '@notifee/react-native';

const CHANNEL_ID = 'ipowerup_battery';

class NotificationService {
  _channelCreated = false;

  async _ensureChannel() {
    if (this._channelCreated) return;
    await notifee.createChannel({
      id: CHANNEL_ID,
      name: 'iPowerUp Alerts',
      importance: AndroidImportance.HIGH,
      sound: 'default',
    });
    this._channelCreated = true;
  }

  async requestPermission() {
    try {
      const settings = await notifee.requestPermission();
      return (
        settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
        settings.authorizationStatus === AuthorizationStatus.PROVISIONAL
      );
    } catch (e) {
      return false;
    }
  }

  async sendLocalNotification(title, body, isCritical = false) {
    try {
      await this._ensureChannel();
      await notifee.displayNotification({
        title,
        body,
        android: {
          channelId: CHANNEL_ID,
          importance: isCritical ? AndroidImportance.HIGH : AndroidImportance.DEFAULT,
          sound: 'default',
          badgeCount: isCritical ? 1 : undefined,
        },
        ios: {
          sound: 'default',
          badgeCount: isCritical ? 1 : undefined,
          categoryId: 'BATTERY_ALERT',
        },
      });
    } catch (e) {}
  }

  async sendBatteryNotification(title, body, isCritical = false) {
    await this.sendLocalNotification(title, body, isCritical);
  }

  async sendTemperatureNotification(type = 'low') {
    const isLow = type === 'low';
    await this.sendLocalNotification(
      'Temperature Alert',
      isLow
        ? 'Case temperature is too low. Device may shutdown.'
        : 'Case temperature is too high. Device may shutdown.',
      true,
    );
  }

  async sendVoltageNotification(type = 'min') {
    await this.sendLocalNotification(
      'Critical Battery Alert',
      type === 'min'
        ? 'Case battery is below minimum threshold. Please charge immediately.'
        : 'Case battery is above maximum threshold. Please disconnect charger.',
      true,
    );
  }
}

export default new NotificationService();
