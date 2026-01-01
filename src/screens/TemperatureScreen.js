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
  Platform,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Colors, Constants, BorderRadius, FontSizes} from '../constants/Constants';
import {safeJsonParse} from '../utils/apiHelper';

const {width, height} = Dimensions.get('window');

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
      // Since backend is not available, save directly to AsyncStorage
      const userData = await AsyncStorage.getItem('loggedInUser');
      let userObj = {};
      
      if (userData) {
        userObj = JSON.parse(userData);
      }
      
      // Update temperature setting in user object
      userObj.tempreture = tempValue;
      
      // Save updated user object to AsyncStorage
      await AsyncStorage.setItem('loggedInUser', JSON.stringify(userObj));
      
      console.log('✅ Temperature setting saved to AsyncStorage:', tempValue);
      
      // Try API call (but don't fail if it doesn't work)
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

        const data = await safeJsonParse(response);

        // If API succeeds, update with server response
        if (data && !data.error && data.data) {
          const serverUserObj = data.data[0];
          serverUserObj.token = await AsyncStorage.getItem('accessToken');
          await AsyncStorage.setItem('loggedInUser', JSON.stringify(serverUserObj));
          console.log('✅ Temperature updated on server as well');
        }
      } catch (apiError) {
        // API failed, but we already saved to AsyncStorage, so it's okay
        console.log('⚠️ API call failed, but setting saved locally:', apiError.message);
      }
      
      showAlert('Success', 'Temperature setting updated');
      navigation.goBack();
    } catch (error) {
      console.error('Error updating temperature:', error);
      showAlert('Error', 'Failed to save temperature setting');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Background Image */}
      <Image
        source={require('../../assets/images/background.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
          <Text style={styles.headerTitle}>Case Temperature</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Temperature Options */}
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

        {/* Continue Button */}
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
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









