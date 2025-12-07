import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  Alert,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Colors, Constants, BorderRadius, FontSizes} from '../constants/Constants';

const TemperatureScreen = ({navigation}) => {
  const [tempValue, setTempValue] = useState('fahrenheit');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadTemperatureSetting();
  }, []);

  const loadTemperatureSetting = async () => {
    try {
      const userData = await AsyncStorage.getItem('loggedInUser');
      if (userData) {
        const user = JSON.parse(userData);
        const savedTemp = user.tempreture || 'fahrenheit';
        setTempValue(savedTemp === 'celsius' ? 'celsius' : 'fahrenheit');
      }
    } catch (error) {
      console.error('Error loading temperature setting:', error);
    }
  };

  const showAlert = (title, message) => {
    Alert.alert(title, message, [{text: 'OK', style: 'default'}]);
  };

  const selectButton = (value) => {
    setTempValue(value);
  };

  const handleContinue = async () => {
    setIsLoading(true);

    try {
      const params = {
        type: tempValue,
      };

      const response = await fetch(`${Constants.baseURLDev}/update-temperature`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const data = await response.json();

      if (data && data.data) {
        const userObj = data.data[0];
        userObj.token = await AsyncStorage.getItem('accessToken');
        await AsyncStorage.setItem('loggedInUser', JSON.stringify(userObj));
        
        showAlert('Success', data?.messages?.msg?.[0] || 'Temperature updated');
        navigation.goBack();
      } else {
        const errorMsg = data?.messages?.msg?.[0] || 'Something went wrong';
        showAlert('Error', errorMsg);
      }
    } catch (error) {
      showAlert('Error', error.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
          <Text style={styles.headerTitle}>Temperature</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Temperature Options - matching iOS */}
        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={styles.optionItem}
            onPress={() => selectButton('fahrenheit')}
            activeOpacity={0.7}
          >
            <Image
              source={
                tempValue === 'fahrenheit'
                  ? require('../../assets/icons/checkbox-checked.png')
                  : require('../../assets/icons/checkbox-unchecked.png')
              }
              style={styles.checkIcon}
              resizeMode="contain"
            />
            <Text style={styles.optionText}>Fahrenheit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionItem}
            onPress={() => selectButton('celsius')}
            activeOpacity={0.7}
          >
            <Image
              source={
                tempValue === 'celsius'
                  ? require('../../assets/icons/checkbox-checked.png')
                  : require('../../assets/icons/checkbox-unchecked.png')
              }
              style={styles.checkIcon}
              resizeMode="contain"
            />
            <Text style={styles.optionText}>Celsius</Text>
          </TouchableOpacity>
        </View>

        {/* Continue Button - matching iOS */}
        <TouchableOpacity
          style={[styles.continueButton, isLoading && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>
            {isLoading ? 'Updating...' : 'Continue'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
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
  optionsContainer: {
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  checkIcon: {
    width: 24,
    height: 24,
    marginRight: 15,
  },
  optionText: {
    fontSize: FontSizes.large,
    fontWeight: '500',
    color: Colors.lightBlackColor,
  },
  continueButton: {
    marginHorizontal: 20,
    marginTop: 40,
    height: 50,
    backgroundColor: Colors.signInBlue,
    borderRadius: BorderRadius.large,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  continueButtonText: {
    fontSize: FontSizes.large,
    fontWeight: 'bold',
    color: Colors.white,
  },
});

export default TemperatureScreen;






