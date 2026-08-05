import {Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee, {AndroidImportance, AuthorizationStatus, EventType} from '@notifee/react-native';
import messaging from '@react-native-firebase/messaging';

const CHANNEL_ID = 'ipowerup_battery';
const DEVICE_TOKEN_KEY = '@ipowerup:fcm_token';
const FALLBACK_TOKEN = 'Abc12345';

class NotificationService {
  _channelCreated = false;
  _initialized = false;
  _deviceToken = FALLBACK_TOKEN;

  async initialize() {
    if (this._initialized) {
      return;
    }
    this._initialized = true;

    try {
      const stored = await AsyncStorage.getItem(DEVICE_TOKEN_KEY);
      if (stored) {
        this._deviceToken = stored;
      }
    } catch (e) {}

    await this._ensureChannel();

    try {
      messaging().onMessage(async remoteMessage => {
        await this.displayRemoteMessage(remoteMessage);
      });

      messaging().onTokenRefresh(async token => {
        if (token) {
          await this._saveDeviceToken(token);
        }
      });

      notifee.onForegroundEvent(({type}) => {
        if (type === EventType.PRESS) {
          notifee.setBadgeCount(0).catch(() => {});
        }
      });
    } catch (e) {
      console.warn('Push notification listeners setup failed:', e);
    }
  }

  async requestAuthorizationIfNeeded() {
    try {
      const settings = await notifee.getNotificationSettings();
      const status = settings.authorizationStatus;

      if (status === AuthorizationStatus.NOT_DETERMINED) {
        return this.requestPermission();
      }

      if (
        status === AuthorizationStatus.AUTHORIZED ||
        status === AuthorizationStatus.PROVISIONAL
      ) {
        await this._registerForRemoteMessages();
        await this._fetchAndSaveToken();
        return true;
      }

      return false;
    } catch (e) {
      console.warn('Notification permission check failed:', e);
      return false;
    }
  }

  async requestPermission() {
    try {
      const settings = await notifee.requestPermission();
      const granted =
        settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
        settings.authorizationStatus === AuthorizationStatus.PROVISIONAL;

      if (granted) {
        await this._registerForRemoteMessages();
        await this._fetchAndSaveToken();
      }

      return granted;
    } catch (e) {
      console.warn('Notification permission request failed:', e);
      return false;
    }
  }

  async _registerForRemoteMessages() {
    try {
      if (Platform.OS === 'ios') {
        const isRegistered = messaging().isDeviceRegisteredForRemoteMessages;
        if (!isRegistered) {
          await messaging().registerDeviceForRemoteMessages();
        }
      }
    } catch (e) {
      console.warn('Remote message registration failed:', e);
    }
  }

  async _fetchAndSaveToken() {
    try {
      const token = await messaging().getToken();
      if (token) {
        await this._saveDeviceToken(token);
      }
      return token;
    } catch (e) {
      console.warn('FCM token fetch failed:', e);
      return this._deviceToken;
    }
  }

  async _saveDeviceToken(token) {
    this._deviceToken = token;
    try {
      await AsyncStorage.setItem(DEVICE_TOKEN_KEY, token);
    } catch (e) {}
  }

  getDeviceToken() {
    return this._deviceToken;
  }

  async getDeviceTokenAsync() {
    await this._fetchAndSaveToken();
    return this._deviceToken;
  }

  async displayRemoteMessage(remoteMessage) {
    const title =
      remoteMessage?.notification?.title ||
      remoteMessage?.data?.title ||
      'iPowerUp';
    const body =
      remoteMessage?.notification?.body || remoteMessage?.data?.body || '';

    if (body) {
      await this.sendLocalNotification(title, body, true);
    }
  }

  async _ensureChannel() {
    if (this._channelCreated) {
      return;
    }
    await notifee.createChannel({
      id: CHANNEL_ID,
      name: 'iPowerUp Alerts',
      importance: AndroidImportance.HIGH,
      sound: 'default',
    });
    this._channelCreated = true;
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
          pressAction: {id: 'default'},
        },
        ios: {
          sound: 'default',
          badgeCount: isCritical ? 1 : undefined,
          categoryId: 'BATTERY_ALERT',
        },
      });
    } catch (e) {
      console.warn('Local notification display failed:', e);
    }
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

const notificationService = new NotificationService();

export async function handleBackgroundMessage(remoteMessage) {
  await notificationService.displayRemoteMessage(remoteMessage);
}

export default notificationService;
