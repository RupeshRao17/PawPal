import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View, Alert, Image, TouchableOpacity } from "react-native";
import { Text, Card, Button, Chip, ActivityIndicator } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { isSupabaseConfigured, OFFLINE_HINT, supabase } from "@/lib/supabase";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { EmptyState } from "@/components/EmptyState";

type Listing = { id: string; city: string; status: string; pets: { name: string; species: string } | null };

export default function AdoptionScreen() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase
      .from("adoption_listings")
      .select("id,city,status,pets(name,species)")
      .eq("status", "available")
      .then(({ data }) => {
        setListings((data as unknown as Listing[]) ?? []);
        setLoading(false);
      });
  }, []);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "available":
        return colors.success;
      case "pending":
        return colors.warning;
      case "adopted":
        return colors.onSurfaceVariant;
      default:
        return colors.onSurfaceVariant;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Adoption Feed
        </Text>
        <Chip icon="heart" style={styles.countChip}>
          {listings.length} Available
        </Chip>
      </View>

      {!isSupabaseConfigured && (
        <Card style={styles.offlineCard}>
          <Card.Content style={styles.offlineContent}>
            <Ionicons name="cloud-offline" size={20} color={colors.warning} />
            <Text variant="bodySmall" style={styles.offlineText}>
              {OFFLINE_HINT}
            </Text>
          </Card.Content>
        </Card>
      )}

      {listings.length === 0 ? (
        <EmptyState
          icon="heart-outline"
          title="No pets available"
          message="Check back later for new adoption listings in your area"
        />
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {listings.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.95}
              onPress={() => {
                router.push({
                  pathname: "/(tabs)/pet-detail",
                  params: {
                    name: item.pets?.name || "Sweet Pet",
                    breed: item.pets?.species || "Unknown Breed",
                    location: item.city,
                  },
                });
              }}
            >
              <Card style={styles.listingCard}>
                <Card.Cover
                  source={{ uri: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800" }}
                  style={styles.cover}
                />
                <Card.Content style={styles.cardContent}>
                  <View style={styles.petHeader}>
                    <Text variant="titleLarge" style={styles.petName}>
                      {item.pets?.name ?? "Sweet Pet"}
                    </Text>
                    <Chip
                      textStyle={{ color: getStatusColor(item.status) }}
                      style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) + "20" }]}
                    >
                      {item.status}
                    </Chip>
                  </View>
                  <View style={styles.locationRow}>
                    <Ionicons name="location" size={16} color={colors.onSurfaceVariant} />
                    <Text variant="bodyMedium" style={styles.locationText}>
                      {item.city}
                    </Text>
                  </View>
                  <Chip icon="paw" style={styles.speciesChip} compact>
                    {item.pets?.species ?? "Unknown"}
                  </Chip>
                </Card.Content>
                <Card.Actions style={styles.cardActions}>
                  <Button icon="information" textColor={colors.primary}>
                    Details
                  </Button>
                  <Button mode="contained" icon="heart" onPress={(e) => {
                    e.stopPropagation();
                    Alert.alert("Adoption Request", "Request sent! We'll contact you soon.");
                  }}>
                    Adopt Me
                  </Button>
                </Card.Actions>
              </Card>
            </TouchableOpacity>
          ))}
          <View style={styles.bottomPadding} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  title: {
    fontWeight: "800",
    color: colors.onSurface,
  },
  countChip: {
    backgroundColor: colors.success + "20",
  },
  offlineCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.warning + "20",
  },
  offlineContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  offlineText: {
    flex: 1,
    color: colors.warning,
  },
  scrollView: {
    flex: 1,
  },
  listingCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  cover: {
    height: 200,
  },
  cardContent: {
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  petHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  petName: {
    fontWeight: "700",
    color: colors.onSurface,
    flex: 1,
  },
  statusChip: {
    marginLeft: spacing.sm,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  locationText: {
    color: colors.onSurfaceVariant,
  },
  speciesChip: {
    alignSelf: "flex-start",
  },
  cardActions: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  bottomPadding: {
    height: 100,
  },
});
