import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();

  const BOTTOM_MIN = Platform.OS === 'android' ? 14 : 18;
  const bottomPosition = Math.max(BOTTOM_MIN, insets.bottom + 6);

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      {/* FLOATING ISLAND TAB BAR */}
      <View style={[styles.container, { bottom: bottomPosition }]}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const renderIcon = options.tabBarIcon;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <View key={route.key} style={styles.tabItem}>
              <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.75}
                accessibilityRole="tab"
                accessibilityState={{ selected: isFocused }}
                accessibilityLabel={options.title || route.name}
                style={[
                  styles.iconButton,
                  isFocused ? styles.iconButtonActive : styles.iconButtonInactive,
                ]}
              >
                {renderIcon &&
                  renderIcon({
                    focused: isFocused,
                    color: isFocused ? '#0B0F10' : '#84958A',
                    size: isFocused ? 20 : 19,
                  })}
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'transparent',
    zIndex: 999,
  },
  container: {
    position: 'absolute',
    flexDirection: 'row',
    height: 60,
    backgroundColor: '#151C1E', // Dark Pekon Elevated Slate
    borderRadius: 999, // Floating pill
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: '#2A363A', // Subtle forest border
    // Android Shadow
    elevation: 12,
    // iOS Shadow
    shadowColor: '#00F2A9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    alignSelf: 'center',
    width: '92%',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonActive: {
    backgroundColor: '#00F2A9', // Cyber Mint Accent
    shadowColor: '#00F2A9',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  iconButtonInactive: {
    backgroundColor: 'transparent',
  },
});

