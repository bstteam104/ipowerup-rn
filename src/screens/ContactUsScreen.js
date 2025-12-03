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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Colors, Constants, BorderRadius, FontSizes} from '../constants/Constants';

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
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
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
            >
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Contact Us</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Form Fields - matching iOS */}
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

            {/* Message Text View - matching iOS UITextView */}
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

            {/* Send Button - matching iOS */}
            <TouchableOpacity
              style={[styles.sendButton, isLoading && styles.buttonDisabled]}
              onPress={handleSend}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Text style={styles.sendButtonText}>
                {isLoading ? 'Sending...' : 'Send'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  flex: {
    flex: 1,
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
    width: 80,
  },
  backText: {
    fontSize: FontSizes.medium,
    color: Colors.black,
  },
  headerTitle: {
    fontSize: FontSizes.heading,
    fontWeight: 'bold',
    color: Colors.lightBlackColor,
  },
  placeholder: {
    width: 80,
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
  sendButton: {
    width: '100%',
    height: 50,
    backgroundColor: Colors.signInBlue,
    borderRadius: BorderRadius.large,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  sendButtonText: {
    fontSize: FontSizes.large,
    fontWeight: 'bold',
    color: Colors.white,
  },
});

export default ContactUsScreen;






