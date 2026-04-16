import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  color?: string;
}

export function StatCard({ icon, label, value, color = colors.primary }: StatCardProps) {
  return (
    <Card style={styles.card}>
      <Card.Content style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.label}>{label}</Text>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  content: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  value: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.onSurface,
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
});
