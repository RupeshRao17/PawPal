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
  { name: 'index',     label: 'Home',      icon: 'home-outline',        activeIcon: 'home' },
  { name: 'health',    label: 'Health',    icon: 'fitness-outline',     activeIcon: 'fitness' },
  { name: 'community', label: 'Community', icon: 'chatbubbles-outline', activeIcon: 'chatbubbles' },
  { name: 'vets',      label: 'Vets',      icon: 'medical-outline',     activeIcon: 'medical' },
  { name: 'chats',     label: 'Chats',     icon: 'mail-outline',        activeIcon: 'mail' },
];

export function CustomTabBar({ state, descriptors, navigation }: CustomTabBarProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.tabBar}>
        {tabConfig.map((tab) => {
          const routeIndex = state.routes.findIndex((r: any) => r.name === tab.name);
          if (routeIndex === -1) return null;
          const isFocused = state.index === routeIndex;
          const route = state.routes[routeIndex];

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
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
                color={isFocused ? colors.onPrimary : colors.outlineVariant}
              />
              <Text style={[styles.label, isFocused && styles.labelActive]}>
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
  wrapper: {
    position: 'absolute',
    bottom: 20,
    left: 12,
    right: 12,
    zIndex: 999,
    elevation: 24,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.onSurface,
    borderRadius: 28,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 24,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 22,
    gap: 3,
  },
  tabActive: { backgroundColor: colors.primary },
  label:     { fontSize: 9, fontWeight: '600', color: colors.outlineVariant },
  labelActive: { color: colors.onPrimary },
});
