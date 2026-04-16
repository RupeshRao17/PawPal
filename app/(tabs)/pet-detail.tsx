import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  Image,
  Dimensions,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { Text } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { colors } from "@/theme/colors";

const { width } = Dimensions.get("window");

export default function PetDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isFavorite, setIsFavorite] = useState(false);

  const pet = {
    name: params.name || "Buddy",
    breed: params.breed || "Golden Retriever",
    age: params.age || "2 Years",
    gender: "Male",
    weight: "32 kg",
    health: "Vaccinated",
    location: params.location || "Maplewood Sanctuary",
    caretaker: "Sarah Mitchell",
    status: "Available",
    image:
      params.image ||
      "https://images.unsplash.com/photo-1552053831-71594a27632d?w=1200",
    gallery: [
      "https://images.unsplash.com/photo-1552053831-71594a27632d?w=400",
      "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400",
      "https://images.unsplash.com/photo-1588943211346-0908a1fb0b01?w=400",
    ],
    personality: ["Playful", "Friendly", "House Trained"],
    description: `${
      params.name || "Buddy"
    } is the personification of sunshine in fur. Rescued from a local farm, this 2-year-old Golden Retriever has never met a stranger he didn't love.\n\nHe is highly intelligent and already knows basic commands like sit, stay, and paw. His favorite activities include fetching tennis balls in the water and curling up by your feet during movie nights.`,
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image */}
        <View style={styles.heroSection}>
          <Image source={{ uri: pet.image }} style={styles.heroImage} />
          <View style={styles.heroOverlay} />
        </View>

        {/* Top Buttons */}
        <View style={styles.topButtons}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setIsFavorite(!isFavorite)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={24}
              color={isFavorite ? "#E53E3E" : "#FFF"}
            />
          </TouchableOpacity>
        </View>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={{ flex: 1 }}>
            <View style={styles.badgeRow}>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{pet.status}</Text>
              </View>
              <View style={styles.locationRow}>
                <Ionicons
                  name="location"
                  size={14}
                  color={colors.onSurfaceVariant}
                />
                <Text style={styles.locationText}>{pet.location}</Text>
              </View>
            </View>
            <Text style={styles.nameText}>{pet.name}</Text>
            <Text style={styles.breedText}>
              {pet.breed} • {pet.age}
            </Text>
          </View>

          <View style={styles.caretakerRow}>
            <Image
              source={{
                uri: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200",
              }}
              style={styles.caretakerImg}
            />
            <View>
              <Text style={styles.caretakerLabel}>Caretaker</Text>
              <Text style={styles.caretakerName}>{pet.caretaker}</Text>
            </View>
          </View>
        </View>

        {/* Info Grid */}
        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <Ionicons name="cake" size={22} color={colors.primary} />
            <Text style={styles.gridLabel}>Age</Text>
            <Text style={styles.gridValue}>{pet.age}</Text>
          </View>
          <View style={styles.gridItem}>
            <Ionicons name="paw" size={22} color={colors.secondary} />
            <Text style={styles.gridLabel}>Gender</Text>
            <Text style={styles.gridValue}>{pet.gender}</Text>
          </View>
          <View style={styles.gridItem}>
            <Ionicons
              name="shield-checkmark"
              size={22}
              color={colors.primary}
            />
            <Text style={styles.gridLabel}>Health</Text>
            <Text style={styles.gridValue}>{pet.health}</Text>
          </View>
          <View style={styles.gridItem}>
            <Ionicons name="scale" size={22} color={colors.secondary} />
            <Text style={styles.gridLabel}>Weight</Text>
            <Text style={styles.gridValue}>{pet.weight}</Text>
          </View>
        </View>

        {/* Personality */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personality</Text>
          <View style={styles.chips}>
            {pet.personality.map((trait, i) => (
              <View key={i} style={styles.chip}>
                <Ionicons
                  name={i === 0 ? "happy" : i === 1 ? "hand-left" : "home"}
                  size={18}
                  color={colors.onTertiaryContainer}
                />
                <Text style={styles.chipText}>{trait}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <View style={styles.aboutHeader}>
            <View style={styles.accentBar} />
            <Text style={styles.sectionTitle}>About Me</Text>
          </View>
          <View style={styles.aboutBox}>
            {pet.description.split("\n\n").map((p, i) => (
              <Text key={i} style={styles.aboutText}>
                {p}
              </Text>
            ))}
          </View>
        </View>

        {/* Gallery */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gallery</Text>
          <View style={styles.gallery}>
            {pet.gallery.map((img, i) => (
              <Image
                key={i}
                source={{ uri: img }}
                style={styles.galleryImg}
              />
            ))}
          </View>
        </View>

        <View style={{ height: 140 }} />
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.adoptBtn} activeOpacity={0.8}>
          <Ionicons name="heart" size={20} color={colors.onSecondary} />
          <Text style={styles.adoptText}>Adopt {pet.name}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  heroSection: {
    height: 450,
    width: "100%",
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    opacity: 0.15,
  },
  topButtons: {
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 10,
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  profileCard: {
    backgroundColor: "#FFF",
    marginHorizontal: 20,
    marginTop: -50,
    borderRadius: 20,
    padding: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    position: "relative",
    zIndex: 5,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  statusBadge: {
    backgroundColor: colors.secondaryContainer,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.onSecondaryContainer,
    letterSpacing: 1,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    fontWeight: "500",
  },
  nameText: {
    fontSize: 38,
    fontWeight: "800",
    color: colors.onSurface,
    marginBottom: 4,
  },
  breedText: {
    fontSize: 16,
    color: colors.onSurfaceVariant,
    fontWeight: "500",
  },
  caretakerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  caretakerImg: {
    width: 60,
    height: 60,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.surfaceContainerHigh,
  },
  caretakerLabel: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginBottom: 2,
  },
  caretakerName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.onSurface,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 8,
  },
  gridItem: {
    flex: 0,
    width: "48%",
    backgroundColor: colors.surfaceContainerLow,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    gap: 4,
  },
  gridLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: colors.onSurfaceVariant,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  gridValue: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.onSurface,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.onSurface,
    marginBottom: 14,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.tertiaryContainer + "50",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.onTertiaryContainer,
  },
  aboutHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  accentBar: {
    width: 4,
    height: 26,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  aboutBox: {
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 16,
    gap: 12,
  },
  aboutText: {
    fontSize: 15,
    lineHeight: 24,
    color: colors.onSurfaceVariant,
  },
  gallery: {
    flexDirection: "row",
    gap: 10,
  },
  galleryImg: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 14,
  },
  bottomBar: {
    position: "absolute",
    bottom: 90,
    left: 0,
    right: 0,
    backgroundColor: colors.surface + "F5",
    padding: 18,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant + "40",
  },
  adoptBtn: {
    backgroundColor: colors.secondary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 28,
    gap: 10,
  },
  adoptText: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.onSecondary,
  },
});
