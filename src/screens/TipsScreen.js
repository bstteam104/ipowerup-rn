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
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {Colors, Constants, FontSizes} from '../constants/Constants';
import {safeJsonParse} from '../utils/apiHelper';

const {width, height} = Dimensions.get('window');

const TipsScreen = ({navigation}) => {
  const {t} = useTranslation();
  const [tips, setTips] = useState([
    {id: '1', question: t('tips.tip1Question'), answer: t('tips.tip1Answer'), isExpanded: false},
    {id: '2', question: t('tips.tip2Question'), answer: t('tips.tip2Answer'), isExpanded: false},
    {id: '3', question: t('tips.tip4Question'), answer: t('tips.tip4Answer'), isExpanded: false},
    {id: '4', question: t('tips.tip5Question'), answer: t('tips.tip5Answer'), isExpanded: false},
  ]);

  useEffect(() => {
    getTips();
  }, []);

  const getTips = async () => {
    try {
      const response = await fetch(`${Constants.baseURLDev}/tips`, {
        method: 'GET',
        headers: {'Content-Type': 'application/json'},
      });
      const data = await safeJsonParse(response);
      if (data && data.error) {return;}
      if (data && data.data && data.data.length > 0) {
        setTips(data.data.map(tip => ({...tip, isExpanded: false})));
      }
    } catch (error) {
      console.log('Using default tips:', error.message);
    }
  };

  const toggleTip = (index) => {
    const updatedTips = [...tips];
    updatedTips[index].isExpanded = !updatedTips[index].isExpanded;
    setTips(updatedTips);
  };

  const renderTipItem = ({item, index}) => (
    <TouchableOpacity
      style={styles.tipItem}
      onPress={() => toggleTip(index)}
      activeOpacity={0.7}>
      <View style={styles.tipHeader}>
        <Text style={styles.tipQuestion} numberOfLines={item.isExpanded ? undefined : 2}>
          {item.question || 'Question'}
        </Text>
        <View style={styles.arrowContainer}>
          <View
            style={[
              styles.chevronArrow,
              item.isExpanded ? styles.chevronUp : styles.chevronDown,
            ]}
          />
        </View>
      </View>
      {item.isExpanded && (
        <Text style={styles.tipAnswer}>{item.answer || 'Answer'}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
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
          <Text style={styles.headerTitle}>{t('tips.title')}</Text>
          <View style={styles.placeholder} />
        </View>

        <FlatList
          data={tips}
          renderItem={renderTipItem}
          keyExtractor={(item, index) => item.id || index.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: 'transparent'},
  backgroundImage: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    width: '100%', height: '100%',
    opacity: 0.55,
  },
  safeArea: {flex: 1},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 50 : 10,
    paddingBottom: 30,
  },
  backButton: {width: 24, height: 24, justifyContent: 'center', alignItems: 'center'},
  backIcon: {width: 24, height: 24, tintColor: Colors.black},
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1D2733',
    textAlign: 'center',
  },
  placeholder: {width: 24},
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
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tipQuestion: {
    flex: 1,
    fontSize: FontSizes.regular,
    fontWeight: '600',
    color: Colors.lightBlackColor,
    lineHeight: 24,
    marginRight: 10,
  },
  arrowContainer: {
    width: 11,
    height: 7,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  chevronArrow: {
    width: 0,
    height: 0,
    borderStyle: 'solid',
  },
  chevronDown: {
    borderLeftWidth: 5.5,
    borderRightWidth: 5.5,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: Colors.cyanBlue,
    borderBottomColor: 'transparent',
  },
  chevronUp: {
    borderLeftWidth: 5.5,
    borderRightWidth: 5.5,
    borderBottomWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: Colors.cyanBlue,
    borderTopColor: 'transparent',
  },
  tipAnswer: {
    fontSize: FontSizes.regular,
    color: Colors.lightBlackColor,
    lineHeight: 24,
    marginTop: 12,
    paddingTop: 8,
  },
});

export default TipsScreen;
