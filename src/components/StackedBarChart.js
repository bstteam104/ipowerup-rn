import React from 'react';
import {View, Text, StyleSheet, Dimensions} from 'react-native';
import {Colors, FontSizes} from '../constants/Constants';

const {width} = Dimensions.get('window');

const StackedBarChart = ({
  data,
  dayLabels,
  wallOutletColor,
  unoCaseColor,
  percentageLabels,
  chartHeight = 140,
}) => {
  const chartWidth = width - 80; // Account for margins
  const rightMargin = 50;
  const chartRectWidth = chartWidth - rightMargin;
  const chartRectHeight = chartHeight - 50; // Space for day labels

  const barWidth = (chartRectWidth / data.length) * 0.6;
  const barSpacing = chartRectWidth / data.length;

  return (
    <View style={styles.container}>
      <View style={styles.chartWrapper}>
        {/* Chart area with bars */}
        <View style={styles.chartArea}>
          {/* Percentage labels on right and grid lines */}
          <View style={styles.labelsAndGrid}>
            {percentageLabels.map((label, index) => {
              const yPosition =
                chartRectHeight -
                (index * chartRectHeight) / Math.max(1, percentageLabels.length - 1);
              return (
                <React.Fragment key={index}>
                  {/* Grid line */}
                  <View
                    style={[
                      styles.gridLine,
                      {
                        top: yPosition + 10,
                        width: chartRectWidth,
                      },
                    ]}
                  />
                  {/* Label */}
                  <Text
                    style={[
                      styles.labelText,
                      {
                        top: yPosition,
                        left: chartRectWidth + 10,
                      },
                    ]}>
                    {label}
                  </Text>
                </React.Fragment>
              );
            })}
          </View>

          {/* Bars */}
          <View style={styles.barsWrapper}>
            {data.map((dataPoint, index) => {
              const totalHeight = (dataPoint.wallOutlet + dataPoint.unoCase) * chartRectHeight;
              const wallOutletHeight = dataPoint.wallOutlet * chartRectHeight;
              const unoCaseHeight = dataPoint.unoCase * chartRectHeight;
              const xPosition = index * barSpacing + (barSpacing - barWidth) / 2;

              return (
                <View key={index} style={styles.barGroup}>
                  {/* Stacked bars */}
                  <View
                    style={[
                      styles.barStack,
                      {
                        left: xPosition,
                        bottom: 20,
                        width: barWidth,
                      },
                    ]}>
                    {/* Wall outlet bar (bottom) */}
                    <View
                      style={[
                        styles.bar,
                        {
                          height: wallOutletHeight,
                          backgroundColor: wallOutletColor,
                        },
                      ]}
                    />
                    {/* Uno case bar (top) - stacked on top */}
                    {unoCaseHeight > 0 && (
                      <View
                        style={[
                          styles.bar,
                          {
                            height: unoCaseHeight,
                            backgroundColor: unoCaseColor,
                          },
                        ]}
                      />
                    )}
                  </View>
                  {/* Day label */}
                  <Text
                    style={[
                      styles.dayLabel,
                      {
                        left: index * barSpacing + barSpacing / 2 - 10,
                        bottom: 0,
                      },
                    ]}>
                    {dayLabels[index] || ''}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    height: 140,
  },
  chartWrapper: {
    height: 140,
    position: 'relative',
  },
  chartArea: {
    height: 140,
    position: 'relative',
    paddingTop: 10,
  },
  labelsAndGrid: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 50,
    height: 120,
  },
  gridLine: {
    position: 'absolute',
    height: 0.5,
    backgroundColor: Colors.lightGray,
    opacity: 0.3,
  },
  labelText: {
    position: 'absolute',
    fontSize: 12,
    color: Colors.grayColor,
    width: 40,
  },
  barsWrapper: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 50,
    height: 120,
  },
  barGroup: {
    position: 'absolute',
    bottom: 0,
  },
  barStack: {
    position: 'absolute',
    flexDirection: 'column-reverse',
  },
  bar: {
    width: '100%',
  },
  dayLabel: {
    position: 'absolute',
    fontSize: 12,
    color: Colors.grayColor,
    width: 20,
    textAlign: 'center',
  },
});

export default StackedBarChart;

