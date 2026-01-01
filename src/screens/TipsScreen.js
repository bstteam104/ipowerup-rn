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
import {safeJsonParse} from '../utils/apiHelper';

const {width, height} = Dimensions.get('window');

const TipsScreen = ({navigation}) => {
  const [tips, setTips] = useState([
    {
      id: '1',
      question: 'How to maximize solar charging?',
      answer: 'Place your device in direct sunlight and ensure the solar panels are clean and unobstructed. The best charging occurs between 10 AM and 4 PM when sunlight is strongest.',
    },
    {
      id: '2',
      question: 'What is the optimal temperature for charging?',
      answer: 'The case works best between 0°C and 45°C. Avoid charging in extreme temperatures as it may affect battery life and charging efficiency.',
    },
    {
      id: '3',
      question: 'How long does it take to fully charge the case?',
      answer: 'Using solar power, it typically takes 4-6 hours of direct sunlight to fully charge the case. USB charging takes approximately 2-3 hours.',
    },
    {
      id: '4',
      question: 'Can I charge my phone while the case is charging?',
      answer: 'Yes! The case supports pass-through charging, allowing you to charge your phone while the case itself is being charged via solar or USB.',
    },
    {
      id: '5',
      question: 'How do I transfer power from case to phone?',
      answer: 'Simply tap the "Transfer Power To Phone" button on the Home screen. Make sure your phone is connected to the case via the charging port.',
    },
  ]);

  useEffect(() => {
    getTips();
  }, []);

  const getTips = async () => {
    try {
      const response = await fetch(`${Constants.baseURLDev}/tips`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await safeJsonParse(response);

      // Check if there's an error - if so, just use default tips
      if (data && data.error) {
        console.log('API Error, using default tips:', data.message);
        return;
      }

      if (data && data.data && data.data.length > 0) {
        setTips(data.data);
      }
      // If API returns empty or fails, keep the default tips
    } catch (error) {
      // Keep default tips if API fails
      console.log('Using default tips:', error.message);
    }
  };

  const renderTipItem = ({item}) => (
    <View style={styles.tipItem}>
      <Text style={styles.tipQuestion}>
        {item.question || 'Question'}
      </Text>
      <Text style={styles.tipAnswer}>
        {item.answer || 'Answer'}
      </Text>
    </View>
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
          <Text style={styles.headerTitle}>iPowerUp Tips</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Tips List UITableView */}
        <FlatList
          data={tips}
          renderItem={renderTipItem}
          keyExtractor={(item, index) => item.id || index.toString()}
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
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 100,
  },
  tipItem: {
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingVertical: 20,
    minHeight: 80,
    marginBottom: 15,
    borderRadius: 10,
  },
  tipQuestion: {
    fontSize: FontSizes.regular,
    fontWeight: '600',
    color: Colors.lightBlackColor,
    marginBottom: 12,
    lineHeight: 24,
  },
  tipAnswer: {
    fontSize: FontSizes.regular,
    color: Colors.lightBlackColor,
    lineHeight: 24,
  },
  separator: {
    height: 0,
    backgroundColor: 'transparent',
  },
});

export default TipsScreen;









