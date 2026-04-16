import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';

interface CustomTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

const tabConfig = [
  { name: 'index',    label: 'Home',    icon: 'home-outline',    activeIcon: 'home' },
  { name: 'adoption', label: 'Adopt',   icon: 'heart-outline',   activeIcon: 'heart' },
  { name: 'health',   label: 'Health',  icon: 'fitness-outline', activeIcon: 'fitness' },
  { name: 'vets',     label: 'Vets',    icon: 'medical-outline', activeIcon: 'medical' },
  { name: 'profile',  label: 'Profile', icon: 'person-outline',  activeIcon: 'person' },
];

export function CustomTabBar({ state, descriptors, navigation }: CustomTabBarProps) {
  // Only render tabs that are in our tabConfig
  const visibleRoutes = state.routes.filter((route: any) =>
    tabConfig.some((t) => t.name === route.name)
  );

  return (
    <View style={styles.tabBarContainer}>
      <View style={styles.tabBar}>
        {tabConfig.map((tab) => {
          const routeIndex = state.routes.findIndex((r: any) => r.name === tab.name);
          if (routeIndex === -1) return null;
          const isFocused = state.index === routeIndex;
          const route = state.routes[routeIndex];

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
            <TouchableOpacity
              key={tab.name}
              onPress={onPress}
              style={[styles.tab, isFocused && styles.tabActive]}
              activeOpacity={0.7}
            >
              <Ionicons
                name={(isFocused ? tab.activeIcon : tab.icon) as any}
                size={22}
                color={isFocused ? colors.surface : colors.onSurfaceVariant}
              />
              <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 20,
    left: 12,
    right: 12,
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
    width: '100%',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 22,
    gap: 3,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  tabLabelActive: {
    color: colors.surface,
  },
});
