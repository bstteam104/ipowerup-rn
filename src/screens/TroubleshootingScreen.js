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
import Header from '../components/Header';

const {width, height} = Dimensions.get('window');

const TroubleshootingScreen = ({navigation}) => {
  const [faqs, setFaqs] = useState([]);

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

      const data = await response.json();

      if (data && data.data) {
        // Add isExpanded property to each FAQ
        const faqsWithExpanded = data.data.map(faq => ({
          ...faq,
          isExpanded: false,
        }));
        setFaqs(faqsWithExpanded);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Something went wrong');
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
        <Text style={styles.expandIcon}>{item.isExpanded ? '−' : '+'}</Text>
      </View>
      {item.isExpanded && (
        <View style={styles.faqAnswerContainer}>
          <Text style={styles.faqAnswer}>{item.answer || 'Answer'}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <Header
          title="Troubleshooting"
          onBackPress={() => navigation.goBack()}
        />

        {/* FAQs List - matching iOS UITableView */}
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
    backgroundColor: Colors.white,
  },
  safeArea: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 10,
  },
  faqItem: {
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingVertical: 15,
    minHeight: 100,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  faqQuestion: {
    flex: 1,
    fontSize: FontSizes.regular,
    fontWeight: '600',
    color: Colors.lightBlackColor,
    marginRight: 15,
    lineHeight: 22,
  },
  expandIcon: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.cyanBlue,
    width: 30,
    textAlign: 'center',
  },
  faqAnswerContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  faqAnswer: {
    fontSize: FontSizes.regular,
    color: Colors.grayColor,
    lineHeight: 22,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.lightGray,
  },
});

export default TroubleshootingScreen;









