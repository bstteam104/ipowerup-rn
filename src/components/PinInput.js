import React, {useState, useRef} from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Dimensions,
} from 'react-native';
import {Colors, BorderRadius} from '../constants/Constants';

const {width} = Dimensions.get('window');

const PinInput = ({pinLength = 4, onComplete, onPinChange}) => {
  const [pin, setPin] = useState(Array(pinLength).fill(''));
  const inputRefs = useRef([]);

  const handleChange = (text, index) => {
    if (text.length > 1) {
      // Handle paste
      const pastedText = text.slice(0, pinLength);
      const newPin = [...pin];
      pastedText.split('').forEach((char, i) => {
        if (index + i < pinLength) {
          newPin[index + i] = char;
        }
      });
      setPin(newPin);
      
      // Focus next empty input
      const nextIndex = Math.min(index + pastedText.length, pinLength - 1);
      if (inputRefs.current[nextIndex]) {
        inputRefs.current[nextIndex].focus();
      }
      
      if (newPin.every(digit => digit !== '')) {
        onComplete?.(newPin.join(''));
      }
      onPinChange?.(newPin.join(''));
      return;
    }

    const newPin = [...pin];
    newPin[index] = text;
    setPin(newPin);

    // Auto-focus next input
    if (text && index < pinLength - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if all fields are filled
    if (newPin.every(digit => digit !== '')) {
      onComplete?.(newPin.join(''));
    }
    onPinChange?.(newPin.join(''));
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.container}>
      {Array(pinLength)
        .fill(0)
        .map((_, index) => (
          <TextInput
            key={index}
            ref={ref => (inputRefs.current[index] = ref)}
            style={[
              styles.input,
              pin[index] ? styles.inputFilled : styles.inputEmpty,
            ]}
            value={pin[index]}
            onChangeText={text => handleChange(text, index)}
            onKeyPress={e => handleKeyPress(e, index)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
            autoFocus={index === 0}
          />
        ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
  },
  input: {
    width: (width - 80) / 4 - 10,
    height: 50,
    borderWidth: 1,
    borderRadius: BorderRadius.small,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
    color: Colors.lightBlackColor,
    backgroundColor: 'transparent',
  },
  inputEmpty: {
    borderColor: Colors.grayColor,
  },
  inputFilled: {
    borderColor: Colors.black,
    borderWidth: 3,
  },
});

export default PinInput;


















