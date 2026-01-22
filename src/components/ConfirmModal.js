import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {Colors, FontSizes, BorderRadius} from '../constants/Constants';

const {width} = Dimensions.get('window');

const ConfirmModal = ({
  visible,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  confirmStyle = 'destructive', // 'destructive' or 'default'
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.contentContainer}>
            {title && <Text style={styles.title}>{title}</Text>}
            {message && <Text style={styles.message}>{message}</Text>}
          </View>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
              activeOpacity={0.7}>
              <Text style={styles.cancelButtonText}>
                {cancelText || 'Cancel'}
              </Text>
            </TouchableOpacity>
            
            <View style={styles.buttonSeparator} />
            
            <TouchableOpacity
              style={[
                styles.button,
                confirmStyle === 'destructive'
                  ? styles.destructiveButton
                  : styles.confirmButton,
              ]}
              onPress={onConfirm}
              activeOpacity={0.7}>
              <Text
                style={[
                  confirmStyle === 'destructive'
                    ? styles.destructiveButtonText
                    : styles.confirmButtonText,
                ]}>
                {confirmText || 'Confirm'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.85,
    maxWidth: 320,
    backgroundColor: Colors.white,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: FontSizes.title,
    fontWeight: '600',
    color: Colors.lightBlackColor,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: FontSizes.medium,
    color: Colors.grayColor,
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: Colors.lightGray || '#E5E5E5',
    height: 50,
  },
  button: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonSeparator: {
    width: 0.5,
    backgroundColor: Colors.lightGray || '#E5E5E5',
  },
  cancelButton: {
    backgroundColor: 'transparent',
  },
  cancelButtonText: {
    fontSize: FontSizes.large,
    fontWeight: '600',
    color: Colors.signInBlue || '#007AFF',
  },
  confirmButton: {
    backgroundColor: 'transparent',
  },
  confirmButtonText: {
    fontSize: FontSizes.large,
    fontWeight: '600',
    color: Colors.signInBlue || '#007AFF',
  },
  destructiveButton: {
    backgroundColor: 'transparent',
  },
  destructiveButtonText: {
    fontSize: FontSizes.large,
    fontWeight: '600',
    color: '#FF3B30',
  },
});

export default ConfirmModal;
