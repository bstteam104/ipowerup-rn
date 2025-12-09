import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Colors, Constants, BorderRadius, FontSizes} from '../constants/Constants';

const {width, height} = Dimensions.get('window');

const ContactUsScreen = ({navigation}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const placeholderText = 'Your Message here';

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('loggedInUser');
      if (userData) {
        const user = JSON.parse(userData);
        setName(user.full_name || '');
        setEmail(user.email || '');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const showAlert = (title, message) => {
    Alert.alert(title, message, [{text: 'OK', style: 'default'}]);
  };

  const isValidEmail = (email) => {
    const emailRegex = /[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,64}/;
    return emailRegex.test(email);
  };

  const fieldsAreValid = () => {
    if (!name || name.trim() === '') {
      showAlert('Error', 'Please enter your name.');
      return false;
    }

    if (!email || email.trim() === '') {
      showAlert('Error', 'Please enter your email.');
      return false;
    }

    if (!isValidEmail(email)) {
      showAlert('Error', 'Please enter a valid email address.');
      return false;
    }

    if (!message || message.trim() === '' || message === placeholderText) {
      showAlert('Error', 'Please enter your message');
      return false;
    }

    return true;
  };

  const handleSend = async () => {
    if (!fieldsAreValid()) {
      return;
    }

    setIsLoading(true);

    try {
      const params = {
        email: email,
        name: name,
        message: message,
      };

      const response = await fetch(`${Constants.baseURLDev}/contact-us`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const data = await response.json();

      if (data && data.success) {
        showAlert('Success', 'Thank you for Contacting us.');
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

  const handleMessageFocus = () => {
    if (message === placeholderText) {
      setMessage('');
    }
  };

  const handleMessageBlur = () => {
    if (message.trim() === '') {
      setMessage(placeholderText);
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
      
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.flex}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
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
              <Text style={styles.headerTitle}>Contact iPowerUp</Text>
              <View style={styles.placeholder} />
            </View>

            {/* Form Fields */}
            <View style={styles.formContainer}>
              {/* Name Field */}
              <View style={styles.inputView}>
                <TextInput
                  style={styles.input}
                  placeholder="Name"
                  placeholderTextColor={Colors.grayColor}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>

              {/* Email Field */}
              <View style={styles.inputView}>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor={Colors.grayColor}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {/* Message Text View UITextView */}
              <View style={styles.messageView}>
                <TextInput
                  style={[
                    styles.messageInput,
                    message === placeholderText && styles.messagePlaceholder,
                  ]}
                  placeholder={placeholderText}
                  placeholderTextColor={Colors.grayColor}
                  value={message}
                  onChangeText={setMessage}
                  onFocus={handleMessageFocus}
                  onBlur={handleMessageBlur}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>
            </View>
          </ScrollView>
          
          {/* Submit Button - at bottom, */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.buttonDisabled]}
              onPress={handleSend}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Text style={styles.submitButtonText}>
                {isLoading ? 'Sending...' : 'Submit'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
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
  formContainer: {
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  inputView: {
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.inputBorderColor,
    borderRadius: BorderRadius.medium,
    backgroundColor: Colors.white,
  },
  input: {
    height: 49,
    paddingHorizontal: 20,
    fontSize: FontSizes.regular,
    color: Colors.lightBlackColor,
  },
  messageView: {
    marginBottom: 30,
    borderWidth: 1,
    borderColor: Colors.inputBorderColor,
    borderRadius: BorderRadius.medium,
    backgroundColor: Colors.white,
    minHeight: 150,
  },
  messageInput: {
    padding: 20,
    fontSize: FontSizes.regular,
    color: Colors.lightBlackColor,
    minHeight: 150,
  },
  messagePlaceholder: {
    color: Colors.grayColor,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 20 : 30,
    paddingTop: 10,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
  },
  submitButton: {
    width: '100%',
    height: 50,
    backgroundColor: Colors.progressYellow, // Yellow color systemYellowColor
    borderRadius: BorderRadius.large,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: FontSizes.large,
    fontWeight: 'bold',
    color: Colors.black,
  },
});

export default ContactUsScreen;









