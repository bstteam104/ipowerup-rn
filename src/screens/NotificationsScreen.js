import React, {useState, useEffect} from 'react';
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
  Dimensions,
  Alert,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {Colors, Constants, FontSizes} from '../constants/Constants';
import {safeJsonParse} from '../utils/apiHelper';

const {width, height} = Dimensions.get('window');

const NotificationsScreen = ({navigation}) => {
  const {t} = useTranslation();
  const [notifications, setNotifications] = useState([
    {
      id: '1',
      date: 'yesterday at 11:44 pm',
      message: 'Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy',
      alertImage: 'alert3',
    },
    {
      id: '2',
      date: 'yesterday at 11:44 pm',
      message: 'Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy',
      alertImage: 'alert2',
    },
    {
      id: '3',
      date: 'yesterday at 11:44 pm',
      message: 'Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy',
      alertImage: 'alert1',
    },
  ]);

  useEffect(() => {
    getNotifications();
  }, []);

  const getNotifications = async () => {
    try {
      const response = await fetch(`${Constants.baseURLDev}/notifications`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await safeJsonParse(response);

      // Check if there's an error in the response
      if (data && data.error) {
        console.error('API Error:', data.message);
        // Don't show alert for API errors, just log and use default notifications
        return;
      }

      if (data && data.data) {
        setNotifications(data.data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Don't show alert, just use default notifications
    }
  };

  const getAlertImage = (imageName) => {
    // Map alert image names to actual image sources
    const imageMap = {
      alert1: require('../../assets/Notification/alert1.png'),
      alert2: require('../../assets/Notification/alert2.png'),
      alert3: require('../../assets/Notification/alert3.png'),
    };
    return imageMap[imageName] || imageMap.alert1;
  };

  const renderNotificationItem = ({item}) => (
    <TouchableOpacity
      style={styles.notificationItem}
      onPress={() => navigation.navigate('NotificationDetail')}
      activeOpacity={0.7}
    >
      <Image
        source={getAlertImage(item.alertImage)}
        style={styles.alertImage}
        resizeMode="contain"
      />
      <View style={styles.notificationContent}>
        <Text style={styles.dateText}>{item.date}</Text>
        <Text style={styles.messageText} numberOfLines={3}>
          {item.message}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Background Image */}
      <Image
        source={require('../../assets/images/background.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Image
              source={require('../../assets/icons/back-arrow-ios.png')}
              style={styles.backIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('notifications.title')}</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Notifications List UITableView */}
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
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
    marginBottom: 8,
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

