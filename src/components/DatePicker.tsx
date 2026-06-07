import React, { useState } from "react";
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

interface Props {
  value: string;
  onChange: (date: string) => void;
  label?: string;
  placeholder?: string;
  maxDate?: Date;
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function range(a: number, b: number) {
  return Array.from({ length: b - a + 1 }, (_, i) => a + i);
}

export function DatePicker({ value, onChange, label, placeholder = "Select date", maxDate }: Props) {
  const now    = new Date();
  const parsed = value ? new Date(value + "T00:00:00") : null;
  const [open,  setOpen]  = useState(false);
  const [year,  setYear]  = useState(parsed?.getFullYear() ?? now.getFullYear());
  const [month, setMonth] = useState(parsed?.getMonth() ?? now.getMonth());
  const [day,   setDay]   = useState(parsed?.getDate() ?? now.getDate());

  const maxY = (maxDate ?? new Date(now.getFullYear() + 5, 0)).getFullYear();
  const years = range(1990, maxY).reverse();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days  = range(1, daysInMonth);

  function confirm() {
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(Math.min(day, daysInMonth)).padStart(2, "0");
    onChange(`${year}-${mm}-${dd}`);
    setOpen(false);
  }

  function display() {
    if (!value) return "";
    const d = new Date(value + "T00:00:00");
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)} activeOpacity={0.75}>
        <View style={styles.triggerInner}>
          <Text style={styles.triggerLabel}>{label ?? "Date"}</Text>
          <Text style={[styles.triggerVal, !value && styles.placeholder]}>
            {display() || placeholder}
          </Text>
        </View>
        <Text style={styles.icon}>📅</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHead}>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Text style={styles.cancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.sheetTitle}>{label ?? "Select Date"}</Text>
              <TouchableOpacity onPress={confirm}>
                <Text style={styles.done}>Done</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.cols}>
              {/* Day */}
              <View style={styles.col}>
                <Text style={styles.colHead}>Day</Text>
                <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                  {days.map((d) => (
                    <TouchableOpacity key={d} style={[styles.item, day === d && styles.itemOn]}
                      onPress={() => setDay(d)}>
                      <Text style={[styles.itemTxt, day === d && styles.itemTxtOn]}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              {/* Month */}
              <View style={styles.col}>
                <Text style={styles.colHead}>Month</Text>
                <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                  {MONTHS.map((m, i) => (
                    <TouchableOpacity key={m} style={[styles.item, month === i && styles.itemOn]}
                      onPress={() => setMonth(i)}>
                      <Text style={[styles.itemTxt, month === i && styles.itemTxtOn]}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              {/* Year */}
              <View style={styles.col}>
                <Text style={styles.colHead}>Year</Text>
                <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                  {years.map((y) => (
                    <TouchableOpacity key={y} style={[styles.item, year === y && styles.itemOn]}
                      onPress={() => setYear(y)}>
                      <Text style={[styles.itemTxt, year === y && styles.itemTxtOn]}>{y}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const S = StyleSheet.create;
const styles = S({
  trigger:      { flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceContainerHighest, borderRadius: 12, padding: spacing.md, marginBottom: spacing.sm },
  triggerInner: { flex: 1 },
  triggerLabel: { fontSize: 11, fontWeight: "700", color: colors.onSurfaceVariant, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3 },
  triggerVal:   { fontSize: 15, color: colors.onSurface, fontWeight: "600" },
  placeholder:  { color: colors.onSurfaceVariant + "80" },
  icon:         { fontSize: 20 },
  overlay:      { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet:        { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 44 },
  sheetHead:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant + "40" },
  sheetTitle:   { fontSize: 16, fontWeight: "700", color: colors.onSurface },
  cancel:       { fontSize: 15, color: colors.onSurfaceVariant },
  done:         { fontSize: 15, color: colors.primary, fontWeight: "700" },
  cols:         { flexDirection: "row", paddingHorizontal: spacing.md, paddingTop: spacing.md, gap: spacing.xs },
  col:          { flex: 1 },
  colHead:      { fontSize: 10, fontWeight: "700", color: colors.onSurfaceVariant, textTransform: "uppercase", letterSpacing: 1, textAlign: "center", marginBottom: 6 },
  scroll:       { height: 230 },
  item:         { paddingVertical: 11, alignItems: "center", borderRadius: 10 },
  itemOn:       { backgroundColor: colors.primaryContainer },
  itemTxt:      { fontSize: 16, color: colors.onSurfaceVariant },
  itemTxtOn:    { color: colors.primary, fontWeight: "700" },
});
