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

const TipsScreen = ({navigation}) => {
  const [tips, setTips] = useState([]);

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

      const data = await response.json();

      if (data && data.data) {
        setTips(data.data);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Something went wrong');
    }
  };

  const renderTipItem = ({item}) => (
    <View style={styles.tipItem}>
      <Text style={styles.tipQuestion} numberOfLines={2}>
        {item.question || 'Question'}
      </Text>
      <Text style={styles.tipAnswer} numberOfLines={4}>
        {item.answer || 'Answer'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <Header
          title="iPowerUp Tips"
          onBackPress={() => navigation.goBack()}
        />

        {/* Tips List - matching iOS UITableView */}
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
    backgroundColor: Colors.white,
  },
  safeArea: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 10,
  },
  tipItem: {
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingVertical: 20,
    minHeight: 150,
  },
  tipQuestion: {
    fontSize: FontSizes.regular,
    fontWeight: '600',
    color: Colors.lightBlackColor,
    marginBottom: 12,
    lineHeight: 22,
  },
  tipAnswer: {
    fontSize: FontSizes.regular,
    color: Colors.grayColor,
    lineHeight: 22,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.lightGray,
  },
});

export default TipsScreen;









