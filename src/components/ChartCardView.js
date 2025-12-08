import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import StackedBarChart from './StackedBarChart';
import {Colors, FontSizes} from '../constants/Constants';

const ChartCardView = ({
  title,
  subtitle,
  wallOutletColor,
  unoCaseColor,
  percentageLabels,
  chartHeight,
  data,
  dayLabels,
  showLegends = false,
  legendWallOutletColor,
  legendUnoCaseColor,
}) => {
  return (
    <View style={styles.cardView}>
      {/* Subtitle */}
      {subtitle ? (
        <Text style={styles.subtitle}>{subtitle}</Text>
      ) : null}

      {/* Title and Wh label row */}
      <View style={styles.titleRow}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.whLabel}>Wh</Text>
      </View>

      {/* Chart */}
      <View style={styles.chartContainer}>
        <StackedBarChart
          data={data || []}
          dayLabels={dayLabels || []}
          wallOutletColor={wallOutletColor}
          unoCaseColor={unoCaseColor}
          percentageLabels={percentageLabels || ['100%', '80%', '60%', '40%', '20%', '0%']}
          chartHeight={chartHeight || 140}
        />
      </View>

      {/* Legends - only show if showLegends is true */}
      {showLegends && (
        <View style={styles.legendView}>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendColor,
                {backgroundColor: legendWallOutletColor || wallOutletColor},
              ]}
            />
            <Text style={styles.legendText}>USB</Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendColor,
                {backgroundColor: legendUnoCaseColor || unoCaseColor},
              ]}
            />
            <Text style={styles.legendText}>Solar</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cardView: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 0,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  subtitle: {
    fontSize: FontSizes.medium,
    color: 'rgba(0, 179, 255, 1)', // Matching iOS UIColor(red: 0.0, green: 0.7, blue: 1.0, alpha: 1.0)
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.black,
  },
  whLabel: {
    fontSize: FontSizes.medium,
    color: Colors.grayColor,
  },
  chartContainer: {
    marginBottom: 20,
  },
  legendView: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 30,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  legendText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666666',
  },
});

export default ChartCardView;










