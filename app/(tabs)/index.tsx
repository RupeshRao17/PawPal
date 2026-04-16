import { ScrollView, StyleSheet, View, TouchableOpacity, Image, Dimensions } from "react-native";
import { Text } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/auth-store";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { useState } from "react";

const { width } = Dimensions.get("window");

export default function HomeScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const [selectedCategory, setSelectedCategory] = useState("Dogs");

  const categories = [
    { name: "Dogs", icon: "paw" },
    { name: "Cats", icon: "paw" },
    { name: "Rabbits", icon: "paw" },
    { name: "Others", icon: "grid" },
  ];

  const featuredPets = [
    {
      id: "1",
      name: "Cooper",
      breed: "Golden Retriever",
      age: "2 Years",
      image: "https://images.unsplash.com/photo-1552053831-71594a27632d?w=800",
      tag: "New Arrival",
      description: "Cooper is a gentle soul who loves sunny afternoon walks and gentle head scratches.",
      featured: true,
    },
    {
      id: "2",
      name: "Luna",
      breed: "Bombay Cat",
      age: "4 Years",
      image: "https://images.unsplash.com/photo-1513245543132-31f507417b26?w=800",
      tag: "Calm",
      description: null,
      featured: false,
    },
    {
      id: "3",
      name: "Max",
      breed: "Corgi",
      age: "1 Year",
      image: "https://images.unsplash.com/photo-1612531386530-97ee5c8e3587?w=800",
      tag: "Energetic",
      description: null,
      featured: false,
    },
  ];

  return (
    <View style={styles.container}>
      {/* Top App Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/(tabs)/pets')}>
            <Ionicons name="menu" size={28} color={colors.primary} />
          </TouchableOpacity>
          <Text variant="titleLarge" style={styles.headerTitle}>
            Nurtured Hearth
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
          <Image
            source={{ uri: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200" }}
            style={styles.avatar}
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Search Section */}
        <View style={styles.heroSection}>
          <Text variant="displaySmall" style={styles.heroTitle}>
            Find your kindred spirit
          </Text>
          <Text variant="bodyLarge" style={styles.heroSubtitle}>
            Every companion has a story waiting for you.
          </Text>

          <TouchableOpacity style={styles.searchContainer} activeOpacity={0.7}>
            <Ionicons name="search" size={24} color={colors.onSurfaceVariant} style={styles.searchIcon} />
            <Text variant="bodyLarge" style={styles.searchPlaceholder}>
              Search breeds, age, or traits...
            </Text>
          </TouchableOpacity>
        </View>

        {/* Category Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
          <View style={styles.categoriesContainer}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.name}
                style={[
                  styles.categoryButton,
                  selectedCategory === category.name && styles.categoryButtonActive,
                ]}
                onPress={() => setSelectedCategory(category.name)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={category.icon as any}
                  size={20}
                  color={selectedCategory === category.name ? colors.onPrimary : colors.onSurfaceVariant}
                />
                <Text
                  variant="labelLarge"
                  style={[
                    styles.categoryText,
                    selectedCategory === category.name && styles.categoryTextActive,
                  ]}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Pet Grid */}
        <View style={styles.petGrid}>
          {featuredPets.map((pet) =>
            pet.featured ? (
              // Featured Card (Asymmetric Layout)
              <TouchableOpacity key={pet.id} style={styles.featuredCard} activeOpacity={0.95}>
                <View style={styles.featuredImageContainer}>
                  <Image source={{ uri: pet.image }} style={styles.featuredImage} />
                  <TouchableOpacity style={styles.heartButton} activeOpacity={0.7}>
                    <Ionicons name="heart" size={24} color={colors.error} />
                  </TouchableOpacity>
                </View>
                <View style={styles.featuredContent}>
                  <View style={styles.tagContainer}>
                    <View style={[styles.tag, { backgroundColor: colors.tertiaryContainer }]}>
                      <Text variant="labelSmall" style={[styles.tagText, { color: colors.onTertiaryContainer }]}>
                        {pet.tag}
                      </Text>
                    </View>
                  </View>
                  <Text variant="headlineLarge" style={styles.featuredName}>
                    {pet.name}
                  </Text>
                  <Text variant="bodyLarge" style={styles.featuredBreed}>
                    {pet.breed} • {pet.age}
                  </Text>
                  <Text variant="bodyMedium" style={styles.featuredDescription} numberOfLines={2}>
                    {pet.description}
                  </Text>
                  <TouchableOpacity 
                    style={styles.meetButton} 
                    activeOpacity={0.8}
                    onPress={() => {
                      router.push({
                        pathname: "/(tabs)/pet-detail",
                        params: {
                          name: pet.name,
                          breed: pet.breed,
                          age: pet.age,
                          location: "Maplewood Sanctuary",
                          image: pet.image,
                        },
                      });
                    }}
                  >
                    <Text variant="labelLarge" style={styles.meetButtonText}>
                      Meet {pet.name}
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ) : (
              // Regular Card
              <TouchableOpacity 
                key={pet.id} 
                style={styles.petCard} 
                activeOpacity={0.95}
                onPress={() => {
                  router.push({
                    pathname: "/(tabs)/pet-detail",
                    params: {
                      name: pet.name,
                      breed: pet.breed,
                      age: pet.age,
                      location: "Maplewood Sanctuary",
                      image: pet.image,
                    },
                  });
                }}
              >
                <View style={styles.petImageContainer}>
                  <Image source={{ uri: pet.image }} style={styles.petImage} />
                  <TouchableOpacity style={styles.heartButtonSmall} activeOpacity={0.7}>
                    <Ionicons name="heart-outline" size={20} color={colors.onSurfaceVariant} />
                  </TouchableOpacity>
                </View>
                <View style={styles.petInfo}>
                  <View style={styles.petHeader}>
                    <View>
                      <Text variant="titleMedium" style={styles.petName}>
                        {pet.name}
                      </Text>
                      <Text variant="bodySmall" style={styles.petBreed}>
                        {pet.breed} • {pet.age}
                      </Text>
                    </View>
                    <View style={[styles.petTag, { backgroundColor: colors.secondaryContainer }]}>
                      <Text variant="labelSmall" style={[styles.petTagText, { color: colors.onSecondaryContainer }]}>
                        {pet.tag}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            )
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl * 1.5,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface + "CC",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontWeight: "800",
    color: colors.onSurface,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.primary + "33",
  },
  scrollView: {
    flex: 1,
  },
  heroSection: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xl,
  },
  heroTitle: {
    fontWeight: "800",
    color: colors.onSurface,
    marginBottom: spacing.xs,
    fontSize: 32,
  },
  heroSubtitle: {
    color: colors.onSurfaceVariant,
    fontWeight: "500",
    marginBottom: spacing.lg,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.sm,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchPlaceholder: {
    color: colors.onSurfaceVariant + "99",
    flex: 1,
  },
  categoriesScroll: {
    marginBottom: spacing.xl,
  },
  categoriesContainer: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  categoryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: spacing.md * 1.5,
    paddingVertical: spacing.sm * 1.5,
    borderRadius: 24,
  },
  categoryButtonActive: {
    backgroundColor: colors.primary,
  },
  categoryText: {
    fontWeight: "500",
    color: colors.onSurfaceVariant,
  },
  categoryTextActive: {
    color: colors.onPrimary,
    fontWeight: "600",
  },
  petGrid: {
    paddingHorizontal: spacing.md,
    gap: spacing.lg,
  },
  featuredCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  featuredImageContainer: {
    width: "100%",
    aspectRatio: 4 / 3,
    position: "relative",
  },
  featuredImage: {
    width: "100%",
    height: "100%",
  },
  heartButton: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface + "E6",
    alignItems: "center",
    justifyContent: "center",
  },
  featuredContent: {
    padding: spacing.lg,
  },
  tagContainer: {
    marginBottom: spacing.sm,
  },
  tag: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  tagText: {
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  featuredName: {
    fontWeight: "700",
    color: colors.onSurface,
    marginBottom: spacing.xs,
    fontSize: 28,
  },
  featuredBreed: {
    color: colors.onSurfaceVariant,
    fontWeight: "500",
    marginBottom: spacing.md,
  },
  featuredDescription: {
    color: colors.onSurfaceVariant,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  meetButton: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.xl * 2,
    paddingVertical: spacing.md,
    borderRadius: 24,
    alignSelf: "flex-start",
  },
  meetButtonText: {
    color: colors.onSecondary,
    fontWeight: "700",
  },
  petCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    overflow: "hidden",
    padding: spacing.md,
  },
  petImageContainer: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: spacing.md,
    position: "relative",
  },
  petImage: {
    width: "100%",
    height: "100%",
  },
  heartButtonSmall: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface + "E6",
    alignItems: "center",
    justifyContent: "center",
  },
  petInfo: {
    flex: 1,
  },
  petHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  petName: {
    fontWeight: "700",
    color: colors.onSurface,
    marginBottom: spacing.xs,
  },
  petBreed: {
    color: colors.onSurfaceVariant,
    fontWeight: "500",
  },
  petTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  petTagText: {
    fontWeight: "700",
  },
  bottomPadding: {
    height: 120,
  },
});
