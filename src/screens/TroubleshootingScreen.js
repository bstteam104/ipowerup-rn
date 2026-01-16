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

const TroubleshootingScreen = ({navigation}) => {
  const {t} = useTranslation();
  const [faqs, setFaqs] = useState([
    {
      id: '1',
      question: t('troubleshooting.faq1Question'),
      answer: t('troubleshooting.faq1Answer'),
      isExpanded: false,
    },
    {
      id: '2',
      question: t('troubleshooting.faq2Question'),
      answer: t('troubleshooting.faq2Answer'),
      isExpanded: false,
    },
    {
      id: '3',
      question: t('troubleshooting.faq3Question'),
      answer: t('troubleshooting.faq3Answer'),
      isExpanded: false,
    },
    {
      id: '4',
      question: t('troubleshooting.faq4Question'),
      answer: t('troubleshooting.faq4Answer'),
      isExpanded: false,
    },
    {
      id: '5',
      question: t('troubleshooting.faq5Question'),
      answer: t('troubleshooting.faq5Answer'),
      isExpanded: false,
    },
  ]);

  useEffect(() => {
    getFAQs();
  }, []);

  const getFAQs = async () => {
    try {
      const response = await fetch(`${Constants.baseURLDev}/faqs`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await safeJsonParse(response);

      // Check if there's an error - if so, just use default FAQs
      if (data && data.error) {
        console.log('API Error, using default FAQs:', data.message);
        return;
      }

      if (data && data.data && data.data.length > 0) {
        // Add isExpanded property to each FAQ
        const faqsWithExpanded = data.data.map(faq => ({
          ...faq,
          isExpanded: false,
        }));
        setFaqs(faqsWithExpanded);
      }
      // If API fails or returns empty, keep default FAQs
    } catch (error) {
      // Keep default FAQs if API fails
      console.log('Using default FAQs:', error.message);
    }
  };

  const toggleFAQ = (index) => {
    const updatedFaqs = [...faqs];
    updatedFaqs[index].isExpanded = !updatedFaqs[index].isExpanded;
    setFaqs(updatedFaqs);
  };

  const renderFAQItem = ({item, index}) => (
    <TouchableOpacity
      style={styles.faqItem}
      onPress={() => toggleFAQ(index)}
      activeOpacity={0.7}
    >
      <View style={styles.faqHeader}>
        <Text style={styles.faqQuestion} numberOfLines={item.isExpanded ? undefined : 2}>
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
        <Text style={styles.faqAnswer}>{item.answer || 'Answer'}</Text>
      )}
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
          <Text style={styles.headerTitle}>{t('troubleshooting.title')}</Text>
          <View style={styles.placeholder} />
        </View>

        {/* FAQs List UITableView */}
        <FlatList
          data={faqs}
          renderItem={renderFAQItem}
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
  faqItem: {
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingVertical: 20,
    minHeight: 80,
    marginBottom: 15,
    borderRadius: 10,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqQuestion: {
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
  faqAnswer: {
    fontSize: FontSizes.regular,
    color: Colors.lightBlackColor,
    lineHeight: 24,
    marginTop: 12,
    paddingTop: 8,
  },
  separator: {
    height: 0,
    backgroundColor: 'transparent',
  },
});

export default TroubleshootingScreen;









