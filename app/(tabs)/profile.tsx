import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, View, TouchableOpacity } from "react-native";
import { Text, Card, Button, TextInput, Avatar, Chip, Divider } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/stores/auth-store";
import { usePetStore } from "@/stores/pet-store";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

const ROLE_LABEL: Record<string, string> = {
  owner: "Pet Owner",
  vet: "Veterinarian",
  shelter_admin: "Shelter Admin",
  superadmin: "Super Admin",
};

function SettingRow({
  icon,
  label,
  value,
  onPress,
  destructive = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.settingRow}>
      <View style={[styles.settingIcon, { backgroundColor: destructive ? colors.error + "15" : colors.surfaceVariant }]}>
        <Ionicons name={icon} size={20} color={destructive ? colors.error : colors.onSurfaceVariant} />
      </View>
      <Text variant="bodyLarge" style={[styles.settingLabel, destructive && { color: colors.error }]}>
        {label}
      </Text>
      <View style={{ flex: 1 }} />
      {value && <Text variant="bodyMedium" style={styles.settingValue}>{value}</Text>}
      {onPress && !destructive && (
        <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceVariant} />
      )}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const session = useAuthStore((s) => s.session);
  const signOut = useAuthStore((s) => s.signOut);
  const { pets, fetchPets } = usePetStore();

  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [role, setRole] = useState("owner");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (session?.user) {
      fetchPets(session.user.id);
      loadProfile();
    }
  }, [session]);

  async function loadProfile() {
    if (!supabase || !session?.user) return;
    const { data } = await supabase
      .from("profiles")
      .select("full_name, city, role")
      .eq("id", session.user.id)
      .single();
    if (data) {
      setFullName(data.full_name ?? "");
      setCity(data.city ?? "");
      setRole(data.role ?? "owner");
    }
  }

  async function handleSave() {
    if (!supabase || !session?.user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim(), city: city.trim() })
      .eq("id", session.user.id);
    setSaving(false);
    if (error) Alert.alert("Error", error.message);
    else setEditing(false);
  }

  function handleSignOut() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: signOut },
    ]);
  }

  const initials = fullName
    ? fullName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : session?.user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.headerSection}>
        <Avatar.Text
          size={84}
          label={initials}
          style={styles.avatar}
          labelStyle={styles.avatarLabel}
        />
        {editing ? (
          <View style={styles.editForm}>
            <TextInput
              label="Full Name"
              mode="outlined"
              value={fullName}
              onChangeText={setFullName}
              style={styles.input}
              left={<TextInput.Icon icon="account" />}
            />
            <TextInput
              label="City"
              mode="outlined"
              value={city}
              onChangeText={setCity}
              style={styles.input}
              left={<TextInput.Icon icon="map-marker" />}
            />
            <View style={styles.editActions}>
              <Button mode="outlined" onPress={() => setEditing(false)} style={{ flex: 1 }}>Cancel</Button>
              <Button mode="contained" onPress={handleSave} loading={saving} disabled={saving} style={{ flex: 1 }}>Save</Button>
            </View>
          </View>
        ) : (
          <>
            <Text variant="headlineSmall" style={styles.nameText}>
              {fullName || session?.user?.email?.split("@")[0] || "User"}
            </Text>
            <Text variant="bodyMedium" style={styles.emailText}>{session?.user?.email}</Text>
            {city ? (
              <View style={styles.locationRow}>
                <Ionicons name="location" size={14} color={colors.onSurfaceVariant} />
                <Text variant="bodySmall" style={styles.cityText}>{city}</Text>
              </View>
            ) : null}
            <View style={styles.roleRow}>
              <Chip icon="shield-check" style={styles.roleChip}>{ROLE_LABEL[role] ?? role}</Chip>
            </View>
            <Button mode="outlined" onPress={() => setEditing(true)} icon="pencil" style={styles.editBtn} compact>
              Edit Profile
            </Button>
          </>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text variant="headlineMedium" style={styles.statValue}>{pets.length}</Text>
          <Text variant="bodySmall" style={styles.statLabel}>Pets</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text variant="headlineMedium" style={styles.statValue}>{ROLE_LABEL[role]?.split(" ")[0] ?? "—"}</Text>
          <Text variant="bodySmall" style={styles.statLabel}>Role</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text variant="headlineMedium" style={styles.statValue}>
            {isSupabaseConfigured ? "✓" : "✗"}
          </Text>
          <Text variant="bodySmall" style={styles.statLabel}>Connected</Text>
        </View>
      </View>

      {/* Account Settings */}
      <Card style={styles.settingsCard}>
        <Card.Content>
          <Text variant="labelLarge" style={styles.settingsSection}>Account</Text>
          <SettingRow icon="mail-outline" label="Email" value={session?.user?.email?.split("@")[0] + "..."} />
          <Divider style={styles.divider} />
          <SettingRow icon="lock-closed-outline" label="Change Password" onPress={() => Alert.alert("Reset Password", "A password reset link would be sent to your email.")} />
          <Divider style={styles.divider} />
          <SettingRow icon="notifications-outline" label="Notifications" onPress={() => Alert.alert("Notifications", "Notification preferences coming soon!")} />
        </Card.Content>
      </Card>

      {/* App Settings */}
      <Card style={styles.settingsCard}>
        <Card.Content>
          <Text variant="labelLarge" style={styles.settingsSection}>App</Text>
          <SettingRow icon="information-circle-outline" label="About PawPal" value="v1.0.0" onPress={() => Alert.alert("PawPal v1.0.0", "Built with React Native & Expo SDK 54\n\nA Mini Project by:\nRupesh Rao · Ramchandran Yadav · Prerana Yadav\n\nMCA 2025–2027\nSIES College of Management Studies")} />
          <Divider style={styles.divider} />
          <SettingRow icon="document-text-outline" label="Privacy Policy" onPress={() => {}} />
          <Divider style={styles.divider} />
          <SettingRow icon="help-circle-outline" label="Help & Support" onPress={() => Alert.alert("Support", "Email: support@pawpal.in")} />
        </Card.Content>
      </Card>

      {/* Sign Out */}
      <Card style={[styles.settingsCard, { marginBottom: spacing.xl }]}>
        <Card.Content>
          <SettingRow icon="log-out-outline" label="Sign Out" destructive onPress={handleSignOut} />
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerSection: { alignItems: "center", paddingTop: spacing.xxl, paddingBottom: spacing.xl, paddingHorizontal: spacing.lg, backgroundColor: colors.surface, gap: spacing.sm },
  avatar: { backgroundColor: colors.primary, marginBottom: spacing.sm },
  avatarLabel: { fontSize: 32, fontWeight: "800", color: colors.surface },
  nameText: { fontWeight: "800", color: colors.onSurface },
  emailText: { color: colors.onSurfaceVariant },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  cityText: { color: colors.onSurfaceVariant },
  roleRow: { flexDirection: "row", gap: spacing.sm },
  roleChip: { backgroundColor: colors.primary + "20" },
  editBtn: { marginTop: spacing.sm },
  editForm: { width: "100%", gap: spacing.sm },
  input: { backgroundColor: colors.surface },
  editActions: { flexDirection: "row", gap: spacing.sm },
  statsRow: { flexDirection: "row", backgroundColor: colors.surface, marginTop: 1, paddingVertical: spacing.md },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statValue: { fontWeight: "800", color: colors.onSurface },
  statLabel: { color: colors.onSurfaceVariant },
  statDivider: { width: 1, backgroundColor: colors.border },
  settingsCard: { marginHorizontal: spacing.md, marginTop: spacing.md },
  settingsSection: { color: colors.onSurfaceVariant, textTransform: "uppercase", letterSpacing: 1, marginBottom: spacing.sm },
  settingRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm, gap: spacing.md },
  settingIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  settingLabel: { color: colors.onSurface, fontWeight: "500" },
  settingValue: { color: colors.onSurfaceVariant },
  divider: { marginVertical: 4 },
});
