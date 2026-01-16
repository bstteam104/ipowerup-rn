import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {Colors} from '../constants/Constants';

const {width, height} = Dimensions.get('window');

const HelpScreen = ({navigation}) => {
  const {t} = useTranslation();
  const MenuItem = ({icon, title, onPress}) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.menuIconContainer}>
        <Image source={icon} style={styles.menuIcon} resizeMode="contain" />
      </View>
      <Text style={styles.menuTitle}>{title}</Text>
      <Image
        source={require('../../assets/icons/right-arrow-ios.png')}
        style={styles.menuArrow}
        resizeMode="contain"
      />
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
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t('help.title')}</Text>
          </View>

          {/* Menu Items */}
          <View style={styles.menuContainer}>
            <MenuItem
              icon={require('../../assets/icons/phone-help.png')}
              title={t('help.contact')}
              onPress={() => navigation.navigate('ContactUs')}
            />
            
            <MenuItem
              icon={require('../../assets/icons/wrench-help.png')}
              title={t('common.help')}
              onPress={() => navigation.navigate('Troubleshooting')}
            />
            
            <MenuItem
              icon={require('../../assets/icons/idea-tips.png')}
              title={t('help.tips')}
              onPress={() => navigation.navigate('Tips')}
            />
          </View>

        </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 50 : 10,
    paddingBottom: 30,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1D2733',
    textAlign: 'center',
  },
  menuContainer: {
    marginHorizontal: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  menuIconContainer: {
    width: 30,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  menuIcon: {
    width: 30,
    height: 24,
    tintColor: Colors.black,
  },
  menuTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1D2733',
  },
  menuArrow: {
    width: 18,
    height: 18,
    tintColor: Colors.black,
  },
});

export default HelpScreen;
