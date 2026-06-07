import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { useHealthStore } from '@/stores/health-store';

interface Props { state: any; descriptors: any; navigation: any; }

const LEFT_TABS = [
  { name: 'index',     label: 'Discover',   icon: 'compass-outline',     activeIcon: 'compass' },
  { name: 'community', label: 'Community',  icon: 'chatbubbles-outline',  activeIcon: 'chatbubbles' },
];
const RIGHT_TABS = [
  { name: 'pets',    label: 'My Pets',  icon: 'paw-outline',    activeIcon: 'paw' },
  { name: 'profile', label: 'Profile',  icon: 'person-outline', activeIcon: 'person' },
];

export function CustomTabBar({ state, navigation }: Props) {
  const overdueCount = useHealthStore((s) => s.overdueCount);
  function press(routeName: string) {
    const idx = state.routes.findIndex((r: any) => r.name === routeName);
    if (idx === -1) return;
    const isFocused = state.index === idx;
    const event = navigation.emit({ type: 'tabPress', target: state.routes[idx].key, canPreventDefault: true });
    if (!isFocused && !event.defaultPrevented) navigation.navigate(routeName);
  }

  function isFocused(name: string) {
    const idx = state.routes.findIndex((r: any) => r.name === name);
    return state.index === idx;
  }

  function TabBtn({ name, label, icon, activeIcon }: typeof LEFT_TABS[0]) {
    const active = isFocused(name);
    if (state.routes.findIndex((r: any) => r.name === name) === -1) return null;
    return (
      <TouchableOpacity style={[styles.tab, active && styles.tabActive]} onPress={() => press(name)} activeOpacity={0.7}>
        <Ionicons name={(active ? activeIcon : icon) as any} size={21} color={active ? colors.onPrimary : colors.outlineVariant} />
        <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.pill}>
        {/* Left tabs */}
        <View style={styles.half}>
          {LEFT_TABS.map((t) => <TabBtn key={t.name} {...t} />)}
        </View>

        {/* Center gap */}
        <View style={styles.gap} />

        {/* Right tabs */}
        <View style={styles.half}>
          {RIGHT_TABS.map((t) => <TabBtn key={t.name} {...t} />)}
        </View>
      </View>

      {/* Center + FAB */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('list-pet')}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 20,
    left: 12,
    right: 12,
    alignItems: 'center',
    zIndex: 999,
    elevation: 24,
  },
  pill: {
    flexDirection: 'row',
    backgroundColor: colors.onSurface,
    borderRadius: 28,
    padding: 6,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 20,
  },
  half:  { flex: 1, flexDirection: 'row' },
  gap:   { width: 64 },  // space for center FAB
  tab:   { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 22, gap: 3 },
  tabActive: { backgroundColor: colors.primary },
  label:     { fontSize: 9, fontWeight: '600', color: colors.outlineVariant },
  labelActive: { color: colors.onPrimary },
  badge:      { position: 'absolute', top: -5, right: -7, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.error, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2, borderWidth: 1.5, borderColor: colors.onSurface },
  badgeTxt:   { fontSize: 8, fontWeight: '800', color: '#fff' },
  fab: {
    position: 'absolute',
    bottom: 10,               // center button pops 10px above the pill top
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 12,
    zIndex: 1000,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    // White ring border
    borderWidth: 3,
    borderColor: colors.background,
    // Pop above pill: pill height ≈ 68px, button is 56px, placed at bottom:10 inside wrapper (wrapper bottom edge = pill bottom)
    // So button bottom is at 10px, top at 66px → sticks above 68px pill by ~2px → use marginTop trick instead
    transform: [{ translateY: -18 }],  // pull it up above the pill
  },
});
