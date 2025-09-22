import React, { memo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Linking,
  Share,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { MapPin, Clock, Phone, Navigation, Share2 } from "lucide-react-native";

export type FacilityCardProps = {
  name: string;
  addressLine: string;
  distanceMiles?: number;
  hours?: string;
  phone?: string;
  accepts?: string;
  category?: "recycling" | "electronics" | "hazardous" | string;
  mapsQuery?: { address?: string; lat?: number; lon?: number };
};

const CATEGORY_COLORS: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  recycling: { bg: "#E9FFF2", text: "#16A34A", border: "#22C55E" },
  electronics: { bg: "#F8E9FF", text: "#A855F7", border: "#C084FC" },
  hazardous: { bg: "#FFEAEA", text: "#EF4444", border: "#F87171" },
  default: { bg: "#EEF2FF", text: "#4F46E5", border: "#818CF8" },
};

function mapsUrl(q?: FacilityCardProps["mapsQuery"]) {
  if (!q) return "https://maps.google.com";
  if (typeof q.lat === "number" && typeof q.lon === "number") {
    return Platform.select({
      ios: `http://maps.apple.com/?ll=${q.lat},${q.lon}`,
      default: `https://www.google.com/maps/search/?api=1&query=${q.lat},${q.lon}`,
    })!;
  }
  if (q.address) {
    const enc = encodeURIComponent(q.address);
    return Platform.select({
      ios: `http://maps.apple.com/?q=${enc}`,
      default: `https://www.google.com/maps/search/?api=1&query=${enc}`,
    })!;
  }
  return "https://maps.google.com";
}

export const FacilityCard = memo((props: FacilityCardProps) => {
  const {
    name,
    addressLine,
    distanceMiles,
    hours,
    phone,
    accepts,
    category = "default",
    mapsQuery,
  } = props;

  const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.default;

  const onDirections = () => Linking.openURL(mapsUrl(mapsQuery));
  const onShare = async () => {
    const text = `${name}\n${addressLine}\n${
      distanceMiles ? `${distanceMiles.toFixed(1)} mi away\n` : ""
    }${hours ? `${hours}\n` : ""}${phone ? `Phone: ${phone}\n` : ""}${
      accepts ? `Accepts: ${accepts}\n` : ""
    }${mapsUrl(mapsQuery)}`;
    try {
      await Share.share({ message: text });
    } catch {
      await Clipboard.setStringAsync(text);
    }
  };

  return (
    <View style={[styles.card, { borderColor: color.border }]}>
      {!!category && (
        <View
          style={[
            styles.pill,
            { backgroundColor: color.bg, borderColor: color.border },
          ]}
        >
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[styles.pillText, { color: color.text }]}
          >
            {category}
          </Text>
        </View>
      )}

      <Text style={styles.title} numberOfLines={2}>
        {name}
      </Text>

      <View style={styles.row}>
        <MapPin size={16} />
        <Text style={styles.rowText} numberOfLines={2}>
          {addressLine}
        </Text>
      </View>

      <View style={styles.rowWrap}>
        {!!distanceMiles && (
          <View style={styles.row}>
            <Text style={[styles.dot]}></Text>
            <Text style={styles.rowText}>{distanceMiles.toFixed(1)} miles</Text>
          </View>
        )}
        {!!hours && (
          <View style={[styles.row, { marginLeft: 8 }]}>
            <Clock size={16} />
            <Text style={styles.rowText} numberOfLines={1}>
              {hours}
            </Text>
          </View>
        )}
      </View>

      {!!phone && (
        <View style={styles.row}>
          <Phone size={16} />
          <Text
            style={[styles.rowText, styles.link]}
            numberOfLines={1}
            onPress={() => Linking.openURL(`tel:${phone}`)}
          >
            {phone}
          </Text>
        </View>
      )}

      {!!accepts && (
        <Text style={styles.accepts} numberOfLines={2}>
          <Text style={styles.acceptsLabel}>Accepts: </Text>
          {accepts}
        </Text>
      )}

      <View style={styles.actions}>
        <Pressable onPress={onDirections} style={styles.dirBtn}>
          <Navigation size={16} />
          <Text style={styles.dirText}>Directions</Text>
        </Pressable>
        <Pressable onPress={onShare} style={styles.iconBtn} hitSlop={10}>
          <Share2 size={18} />
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    position: "relative",
    borderWidth: 2,
    borderRadius: 16,
    padding: 14,
    marginVertical: 8,
    backgroundColor: "#fff",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 3 },
    }),
  },
  title: { fontSize: 16, fontWeight: "700", marginRight: 100, marginBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  rowWrap: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  rowText: { fontSize: 14, color: "#334155" },
  link: { textDecorationLine: "underline" },
  accepts: { fontSize: 14, color: "#475569", marginTop: 2 },
  acceptsLabel: { fontWeight: "600", color: "#0f172a" },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 10,
  },
  dirBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  dirText: { fontWeight: "600", fontSize: 14 },
  iconBtn: {
    height: 40,
    width: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  pill: {
    position: "absolute",
    top: 8,
    right: 12,
    paddingHorizontal: 10,
    height: 22,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    maxWidth: 120,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "lowercase",
    includeFontPadding: false,
  },
  dot: { width: 0, marginRight: 0 },
});
