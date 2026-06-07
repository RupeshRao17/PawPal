import { useEffect, useState, Platform } from "react";
import {
  Alert, Image, ScrollView, StyleSheet,
  TouchableOpacity, View,
} from "react-native";
import { Text, Card, Button, TextInput, Avatar, Chip, Divider, ActivityIndicator } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/auth-store";
import { usePetStore } from "@/stores/pet-store";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

let ImagePicker: any = null;
try { ImagePicker = require("expo-image-picker"); } catch {}

const ROLE_LABEL: Record<string, string> = {
  owner: "Pet Owner", vet: "Veterinarian",
  shelter_admin: "Shelter Admin", superadmin: "Super Admin",
};

function SettingRow({ icon, label, value, onPress, destructive = false }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string; value?: string;
  onPress?: () => void; destructive?: boolean;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.settingRow}>
      <View style={[styles.settingIcon, { backgroundColor: destructive ? colors.error + "15" : colors.surfaceVariant }]}>
        <Ionicons name={icon} size={20} color={destructive ? colors.error : colors.onSurfaceVariant} />
      </View>
      <Text variant="bodyLarge" style={[styles.settingLabel, destructive && { color: colors.error }]}>{label}</Text>
      <View style={{ flex: 1 }} />
      {value && <Text variant="bodyMedium" style={styles.settingValue}>{value}</Text>}
      {onPress && !destructive && <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceVariant} />}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const router    = useRouter();
  const session   = useAuthStore((s) => s.session);
  const signOut   = useAuthStore((s) => s.signOut);
  const clearPets = usePetStore((s) => s.clearPets);
  const { pets, fetchPets } = usePetStore();

  const [fullName,  setFullName]  = useState("");
  const [city,      setCity]      = useState("");
  const [phone,     setPhone]     = useState("");
  const [role,      setRole]      = useState("owner");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [editing,   setEditing]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (session?.user) { fetchPets(session.user.id); loadProfile(); }
  }, [session]);

  async function loadProfile() {
    if (!supabase || !session?.user) return;
    const { data } = await supabase
      .from("profiles")
      .select("full_name, city, role, phone, avatar_url")
      .eq("id", session.user.id)
      .single();
    if (data) {
      setFullName(data.full_name ?? "");
      setCity(data.city ?? "");
      setPhone(data.phone ?? "");
      setRole(data.role ?? "owner");
      setAvatarUrl(data.avatar_url ?? null);
    }
  }

  async function handleSave() {
    if (!supabase || !session?.user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles")
      .update({ full_name: fullName.trim(), city: city.trim(), phone: phone.trim() || null })
      .eq("id", session.user.id);
    setSaving(false);
    if (error) Alert.alert("Error", error.message);
    else setEditing(false);
  }

  async function handlePickAvatar() {
    if (!ImagePicker) {
      Alert.alert("Not available", "Run: npx expo install expo-image-picker");
      return;
    }
    if (Platform.OS !== "web") {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") { Alert.alert("Permission needed", "Allow photo library access."); return; }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.8, allowsEditing: true, aspect: [1, 1],
    });
    if (result.canceled || !result.assets?.[0]) return;
    setUploadingAvatar(true);
    try {
      const asset    = result.assets[0];
      const mimeType = asset.mimeType ?? "image/jpeg";
      const ext      = mimeType.includes("png") ? "png" : "jpg";
      const path     = `${session!.user.id}/avatar.${ext}`;
      const response = await fetch(asset.uri);
      const buf      = await response.arrayBuffer();
      const { error: upErr } = await supabase!.storage
        .from("avatars").upload(path, buf, { upsert: true, contentType: mimeType });
      if (upErr) throw upErr;
      const { publicUrl } = supabase!.storage.from("avatars").getPublicUrl(path).data;
      const url = `${publicUrl}?t=${Date.now()}`;
      await supabase!.from("profiles").update({ avatar_url: url }).eq("id", session!.user.id);
      setAvatarUrl(url);
    } catch (e: any) { Alert.alert("Upload failed", e.message); }
    finally { setUploadingAvatar(false); }
  }

  async function handlePasswordReset() {
    if (!supabase || !session?.user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(session.user.email);
    if (error) Alert.alert("Error", error.message);
    else Alert.alert("Email sent", "Check your inbox for the password reset link.");
  }

  function handleSignOut() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out", style: "destructive",
        onPress: () => { clearPets(); signOut(); },
      },
    ]);
  }

  const initials = fullName
    ? fullName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : session?.user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 120 }}>

      {/* Hero / Avatar */}
      <View style={styles.heroSection}>
        <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.85} style={styles.avatarWrap}>
          {uploadingAvatar ? (
            <View style={styles.avatarLoading}>
              <ActivityIndicator size="large" color={colors.onPrimary} />
            </View>
          ) : avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
          ) : (
            <Avatar.Text size={90} label={initials} style={styles.avatar} labelStyle={styles.avatarLabel} />
          )}
          <View style={styles.cameraBadge}>
            <Ionicons name="camera" size={14} color={colors.onPrimary} />
          </View>
        </TouchableOpacity>

        {editing ? (
          <View style={styles.editForm}>
            <TextInput label="Full Name" mode="outlined" value={fullName} onChangeText={setFullName}
              style={styles.input} left={<TextInput.Icon icon="account" />} />
            <TextInput label="City" mode="outlined" value={city} onChangeText={setCity}
              style={styles.input} left={<TextInput.Icon icon="map-marker" />} />
            <TextInput label="Phone Number" mode="outlined" value={phone} onChangeText={setPhone}
              style={styles.input} keyboardType="phone-pad"
              left={<TextInput.Icon icon="phone" />} placeholder="+91 98765 40000" />
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
            {phone ? (
              <View style={styles.metaRow}>
                <Ionicons name="call-outline" size={13} color={colors.onSurfaceVariant} />
                <Text style={styles.metaText}>{phone}</Text>
              </View>
            ) : null}
            {city ? (
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={13} color={colors.onSurfaceVariant} />
                <Text style={styles.metaText}>{city}</Text>
              </View>
            ) : null}
            <View style={styles.chipRow}>
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
        {[
          { label: "Pets", val: String(pets.length) },
          { label: "Role",  val: ROLE_LABEL[role]?.split(" ")[0] ?? "—" },
          { label: "Status", val: isSupabaseConfigured ? "Active" : "Offline" },
        ].map((s, i) => (
          <View key={s.label} style={{ flex: 1, flexDirection: "row" }}>
            {i > 0 && <View style={styles.statDivider} />}
            <View style={styles.statItem}>
              <Text variant="headlineSmall" style={styles.statValue}>{s.val}</Text>
              <Text variant="bodySmall" style={styles.statLabel}>{s.label}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Account settings */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="labelLarge" style={styles.sectionTitle}>Account</Text>
          <SettingRow icon="mail-outline" label="Email"
            value={(session?.user?.email ?? "").split("@")[0] + "…"} />
          <Divider style={styles.divider} />
          <SettingRow icon="lock-closed-outline" label="Change Password" onPress={handlePasswordReset} />
          <Divider style={styles.divider} />
          <SettingRow icon="chatbubbles-outline" label="My Adoption Chats" onPress={() => router.push("/(tabs)/chats")} />
          <Divider style={styles.divider} />
          <SettingRow icon="notifications-outline" label="Notifications"
            onPress={() => Alert.alert("Coming soon", "Push notifications coming in a future update.")} />
        </Card.Content>
      </Card>

      {/* App */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="labelLarge" style={styles.sectionTitle}>App</Text>
          <SettingRow icon="book-outline" label="Breed Guide" onPress={() => router.push("/(tabs)/breed-guide")} />
          <Divider style={styles.divider} />
          <SettingRow icon="information-circle-outline" label="About PawPal" value="v1.0.0"
            onPress={() => Alert.alert(
              "PawPal v1.0.0",
              "A complete pet care & adoption app.\n\nBuilt with React Native & Expo SDK 54\nBackend: Supabase\n\nMCA Mini Project 2025–2027\nSIES College of Management Studies"
            )} />
          <Divider style={styles.divider} />
          <SettingRow icon="help-circle-outline" label="Help & Support"
            onPress={() => Alert.alert("Support", "Email us at support@pawpal.in")} />
        </Card.Content>
      </Card>

      {/* Sign Out */}
      <Card style={[styles.card, { marginBottom: spacing.xl }]}>
        <Card.Content>
          <SettingRow icon="log-out-outline" label="Sign Out" destructive onPress={handleSignOut} />
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: colors.background },
  heroSection:   { alignItems: "center", paddingTop: 60, paddingBottom: spacing.xl, paddingHorizontal: spacing.lg, backgroundColor: colors.surface, gap: spacing.sm },
  avatarWrap:    { position: "relative", marginBottom: spacing.sm },
  avatarImg:     { width: 90, height: 90, borderRadius: 45 },
  avatarLoading: { width: 90, height: 90, borderRadius: 45, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  avatar:        { backgroundColor: colors.primary },
  avatarLabel:   { fontSize: 32, fontWeight: "800", color: colors.surface },
  cameraBadge:   { position: "absolute", bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.surface },
  nameText:      { fontWeight: "800", color: colors.onSurface },
  emailText:     { color: colors.onSurfaceVariant },
  metaRow:       { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText:      { fontSize: 13, color: colors.onSurfaceVariant },
  chipRow:       { flexDirection: "row" },
  roleChip:      { backgroundColor: colors.primary + "20" },
  editBtn:       { marginTop: spacing.sm },
  editForm:      { width: "100%", gap: spacing.sm },
  input:         { backgroundColor: colors.surface },
  editActions:   { flexDirection: "row", gap: spacing.sm },
  statsRow:      { flexDirection: "row", backgroundColor: colors.surface, marginTop: 1, paddingVertical: spacing.md },
  statItem:      { flex: 1, alignItems: "center", gap: 2 },
  statValue:     { fontWeight: "800", color: colors.onSurface, fontSize: 22 },
  statLabel:     { color: colors.onSurfaceVariant, fontSize: 12 },
  statDivider:   { width: 1, backgroundColor: colors.outlineVariant + "60", marginVertical: 8 },
  card:          { marginHorizontal: spacing.md, marginTop: spacing.md },
  sectionTitle:  { color: colors.onSurfaceVariant, textTransform: "uppercase", letterSpacing: 1, marginBottom: spacing.sm },
  settingRow:    { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm, gap: spacing.md },
  settingIcon:   { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  settingLabel:  { color: colors.onSurface, fontWeight: "500" },
  settingValue:  { color: colors.onSurfaceVariant, fontSize: 13 },
  divider:       { marginVertical: 2 },
});
