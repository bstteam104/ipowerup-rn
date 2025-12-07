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
import {Colors, Constants, FontSizes} from '../constants/Constants';

const {width, height} = Dimensions.get('window');

const NotificationsScreen = ({navigation}) => {
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

      const data = await response.json();

      if (data && data.data) {
        setNotifications(data.data);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Something went wrong');
    }
  };

  const getAlertImage = (imageName) => {
    // Map alert image names to actual image sources - matching iOS
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
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Image
              source={require('../../assets/icons/back-arrow.png')}
              style={styles.backIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Notifications List - matching iOS UITableView */}
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
    backgroundColor: Colors.white,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backIcon: {
    width: 24,
    height: 24,
    tintColor: Colors.black,
  },
  headerTitle: {
    fontSize: FontSizes.heading,
    fontWeight: 'bold',
    color: Colors.lightBlackColor,
  },
  placeholder: {
    width: 40,
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

