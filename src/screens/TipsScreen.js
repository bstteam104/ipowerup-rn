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

const TipsScreen = ({navigation}) => {
  const {t} = useTranslation();
  const [tips, setTips] = useState([
    {
      id: '1',
      question: t('tips.tip1Question'),
      answer: t('tips.tip1Answer'),
    },
    {
      id: '2',
      question: t('tips.tip2Question'),
      answer: t('tips.tip2Answer'),
    },
    {
      id: '3',
      question: t('tips.tip3Question'),
      answer: t('tips.tip3Answer'),
    },
    {
      id: '4',
      question: t('tips.tip4Question'),
      answer: t('tips.tip4Answer'),
    },
    {
      id: '5',
      question: t('tips.tip5Question'),
      answer: t('tips.tip5Answer'),
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
          <Text style={styles.headerTitle}>{t('tips.title')}</Text>
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









