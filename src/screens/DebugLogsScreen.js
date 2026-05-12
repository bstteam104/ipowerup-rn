import React, {useCallback, useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Image, Platform} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {Colors, BorderRadius, FontSizes} from '../constants/Constants';
import {getBleDebugLogs} from '../utils/bleDebugLog';

const DebugLogsScreen = ({navigation}) => {
  const [logs, setLogs] = useState([]);

  const loadLogs = useCallback(async () => {
    const entries = await getBleDebugLogs();
    setLogs(entries);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadLogs();
    }, [loadLogs]),
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <Image
        source={require('../../assets/images/background.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Image source={require('../../assets/icons/back-arrow-ios.png')} style={styles.backIcon} resizeMode="contain" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>BLE Debug Logs</Text>
        <TouchableOpacity onPress={loadLogs} activeOpacity={0.7}>
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {logs.length === 0 ? (
          <Text style={styles.empty}>No logs yet.</Text>
        ) : (
          logs.map((log) => (
            <View key={log.id} style={styles.card}>
              <Text style={styles.time}>{new Date(log.timestamp).toLocaleString()}</Text>
              <Text style={styles.type}>{log.type}</Text>
              <Text style={styles.message}>{log.message}</Text>
              {log.data ? <Text style={styles.data}>{JSON.stringify(log.data)}</Text> : null}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: 'transparent'},
  backgroundImage: {...StyleSheet.absoluteFillObject, opacity: 0.55},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 50 : 10,
    paddingBottom: 16,
  },
  backButton: {width: 24, height: 24, justifyContent: 'center', alignItems: 'center'},
  backIcon: {width: 24, height: 24, tintColor: Colors.black},
  headerTitle: {fontSize: 20, fontWeight: '700', color: '#1D2733'},
  refreshText: {fontSize: FontSizes.regular, fontWeight: '600', color: Colors.signInBlue},
  content: {padding: 16, paddingBottom: 40},
  empty: {fontSize: FontSizes.regular, color: Colors.lightBlackColor},
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    padding: 12,
    marginBottom: 10,
    borderWidth: 0.8,
    borderColor: '#E0E0E0',
  },
  time: {fontSize: 11, color: '#666'},
  type: {fontSize: 12, fontWeight: '700', color: '#1D2733', marginTop: 4},
  message: {fontSize: 13, color: '#1D2733', marginTop: 2},
  data: {fontSize: 11, color: '#555', marginTop: 4},
});

export default DebugLogsScreen;
