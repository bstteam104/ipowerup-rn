import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  StatusBar,
  SafeAreaView,
  Platform,
  DeviceEventEmitter,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useFocusEffect} from '@react-navigation/native';
import {Colors, FontSizes} from '../constants/Constants';
import {
  getActiveNotifications,
  formatNotificationDate,
  NOTIFICATION_HISTORY_UPDATED,
} from '../storage/NotificationHistoryStorage';

const NotificationsScreen = ({navigation}) => {
  const {t} = useTranslation();
  const [notifications, setNotifications] = useState([]);

  const loadNotifications = useCallback(async () => {
    const active = await getActiveNotifications();
    setNotifications(active);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
      const sub = DeviceEventEmitter.addListener(
        NOTIFICATION_HISTORY_UPDATED,
        loadNotifications,
      );
      return () => sub.remove();
    }, [loadNotifications]),
  );

  const getAlertImage = imageName => {
    const imageMap = {
      alert1: require('../../assets/Notification/alert1.png'),
      alert2: require('../../assets/Notification/alert2.png'),
      alert3: require('../../assets/Notification/alert3.png'),
    };
    return imageMap[imageName] || imageMap.alert1;
  };

  const renderNotificationItem = ({item}) => (
    <View style={styles.notificationItem}>
      <Image
        source={getAlertImage(item.alertImage)}
        style={styles.alertImage}
        resizeMode="contain"
      />
      <View style={styles.notificationContent}>
        <Text style={styles.dateText}>
          {formatNotificationDate(item.updatedAt || item.createdAt)}
        </Text>
        <Text style={styles.titleText} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.messageText} numberOfLines={3}>
          {item.body}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      <Image
        source={require('../../assets/images/background.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}>
            <Image
              source={require('../../assets/icons/back-arrow-ios.png')}
              style={styles.backIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('notifications.title')}</Text>
          <View style={styles.placeholder} />
        </View>

        {notifications.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              {t('notifications.notAvailable', 'Notification not available.')}
            </Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            renderItem={renderNotificationItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.55,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 50 : 10,
    paddingBottom: 30,
  },
  backButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    width: 24,
    height: 24,
    tintColor: Colors.black,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1D2733',
    textAlign: 'center',
  },
  placeholder: {
    width: 24,
  },
  emptyCard: {
    marginHorizontal: 40,
    marginTop: '40%',
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 70,
  },
  emptyText: {
    fontSize: 20,
    color: Colors.black,
    textAlign: 'center',
  },
  listContent: {
    paddingVertical: 10,
  },
  notificationItem: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: Colors.white,
    minHeight: 120,
  },
  alertImage: {
    width: 60,
    height: 60,
    marginRight: 15,
  },
  notificationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  dateText: {
    fontSize: FontSizes.small,
    color: Colors.grayColor,
    marginBottom: 4,
  },
  titleText: {
    fontSize: FontSizes.regular,
    fontWeight: '600',
    color: Colors.lightBlackColor,
    marginBottom: 4,
  },
  messageText: {
    fontSize: FontSizes.regular,
    color: Colors.lightBlackColor,
    lineHeight: 20,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.lightGray,
    marginHorizontal: 20,
  },
});

export default NotificationsScreen;
