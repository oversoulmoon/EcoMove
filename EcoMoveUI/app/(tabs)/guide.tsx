import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { MapPin } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import Spacer from "@/components/spacer";
import { FlatList, Linking, Share, Platform } from "react-native";
import * as Clipboard from "expo-clipboard";
import { NAME_TO_ABBR } from "@/constants/server";
import recyclingData from "../../components/High-volume_Recycling_Infrastructure_-615317352202141496.json";
import stateItemsRaw from "../../components/trash.json";
import { ArrowUpRight } from "lucide-react-native";
type StateStatus = "Recyclable" | "Compost" | "Trash" | "Special handling";
type StateItemsEntry = {
  State: string;
  Items: { id: number; name: string; status: StateStatus }[];
};
const STATE_ITEMS = stateItemsRaw as StateItemsEntry[];

type TabKey = "guidelines" | "drop_off";

const toKey = (s: string) => s.trim().toLowerCase();

const ABBR_TO_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(NAME_TO_ABBR).map(([name, abbr]) => [
    abbr,
    name.replace(/\b\w/g, (m) => m.toUpperCase()),
  ]),
);

function soft(hex: string, alpha = 0.15) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function getStateItems(stateHint: string | null) {
  if (!stateHint) return null;
  const key = toKey(ABBR_TO_NAME[stateHint.toUpperCase()] ?? stateHint);
  const entry = STATE_ITEMS.find((e) => toKey(e.State) === key);
  return entry ?? null;
}

export default function GuideScreen() {
  const { city, region } = useLocalSearchParams<{
    city?: string;
    region?: string;
  }>();
  const [tab, setTab] = React.useState<TabKey>("guidelines");
  const [locLoading, setLocLoading] = React.useState(false);
  const [locError, setLocError] = React.useState<string | null>(null);
  const [geoCity, setGeoCity] = React.useState<string | null>(null);
  const [geoRegion, setGeoRegion] = React.useState<string | null>(null);

  const locationText = React.useMemo(() => {
    const c = geoCity ?? (city as string | undefined);
    const r = geoRegion ?? (region as string | undefined);
    if (c && r) return `${c}, ${r}`;
    if (c) return c;
    if (locLoading) return "Locating...";
    if (locError) return "Location permission needed";
    return "Select a location";
  }, [geoCity, geoRegion, city, region, locLoading, locError]);

  React.useEffect(() => {
    fetchLocation();
  }, []);

  const fetchLocation = async () => {
    try {
      setLocLoading(true);
      setLocError(null);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocError("Location permission denied");
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const places = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });

      const first = places[0];
      setGeoCity(first?.city || first?.subregion || null);
      setGeoRegion(first?.region || first?.postalCode || null);
    } catch (e: any) {
      setLocError(e?.message ?? "Failed to get location");
    } finally {
      setLocLoading(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#f7fbf8" }}>
      <LinearGradient
        colors={["#e9f7ef", "#f7fbf8"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.title}>Location Guide</Text>
        <View style={styles.locRow}>
          <MapPin size={16} color="#10b981" />
          <Text style={styles.locText}>{locationText}</Text>

          <TouchableOpacity
            onPress={fetchLocation}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ marginLeft: 8 }}
          >
            <Text style={{ color: "#10b981", fontWeight: "600" }}>
              {locError ? "Enable" : "Refresh"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.segmentWrap}>
          <Segment
            label="Guidelines"
            active={tab === "guidelines"}
            onPress={() => setTab("guidelines")}
          />
          <Segment
            label="Drop-offs"
            active={tab === "drop_off"}
            onPress={() => setTab("drop_off")}
          />
        </View>
      </LinearGradient>

      <View style={styles.contentBox}>
        {tab === "guidelines" ? (
          <GuidelinesPane stateHint={geoRegion ?? region ?? null} />
        ) : (
          <DropoffsPane />
        )}
      </View>

      <Spacer bottomBarHeight={85} />
    </ScrollView>
  );
}

function Segment({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.segment, active && styles.segmentActive]}
    >
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function GuidelinesPane({ stateHint }: { stateHint: string | null }) {
  const entry = React.useMemo(() => getStateItems(stateHint), [stateHint]);

  if (!stateHint) {
    return (
      <View style={{ gap: 12 }}>
        <Text style={{ color: "#9ca3af" }}>Waiting for location...</Text>
        <ActivityIndicator />
      </View>
    );
  }

  if (!entry) {
    return (
      <View style={{ gap: 12 }}>
        <Text style={{ color: "#9ca3af" }}>No data for this state.</Text>
      </View>
    );
  }

  const rows = entry.Items.map((it) => ({
    id: it.id,
    name: it.name,
    cat:
      it.status === "Recyclable"
        ? "recyclable"
        : it.status === "Compost"
          ? "compostable"
          : it.status === "Special handling"
            ? "dropoff"
            : "trash",
  }));

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.table}>
        <View style={[styles.tr, styles.trHead]}>
          <Text style={[styles.th, { flex: 2 }]}>Item</Text>
          <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>
            Category
          </Text>
        </View>

        {rows.map((r, idx) => (
          <View key={r.id} style={[styles.tr, idx % 2 ? styles.trAlt : null]}>
            <Text style={[styles.td, { flex: 2 }]} numberOfLines={1}>
              {r.name}
            </Text>
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <CategoryPill value={r.cat} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
function DropoffsPane() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<FacilityRow[]>([]);

  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setError("Location permission not granted");
          setLoading(false);
          return;
        }

        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const { latitude, longitude } = pos.coords;

        const nearest = getNearestFacilitiesFromEsri(
          recyclingData,
          longitude,
          latitude,
          8,
        );

        const mapped: FacilityRow[] = nearest.map((n) => {
          const a = n.attributes || {};
          const address = [
            a.Street,
            [a.City, a.State].filter(Boolean).join(", "),
            a.Zip_Code,
          ]
            .filter(Boolean)
            .join(" ");

          return {
            id: `${a.OBJECTID ?? a.Name ?? Math.random()}`,
            name: a.Name ?? "Unknown facility",
            addressLine: address,
            distanceMiles: n.distanceMiles,
            hours: a.Hours_of_Operation || a.Hours || a.Open_Hours || undefined,
            phone: a.TELEPHONE || a.Phone || undefined,
            accepts:
              a.Accepted_Items || a.Categories || a.Feedstock || undefined,
            category: inferCategory(a.Infra_Type),
            mapsQuery: webMercatorToMapsQuery(
              n.coordMercator.x,
              n.coordMercator.y,
              address,
            ),
          };
        });

        setRows(mapped);
      } catch (e: any) {
        setError(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={{ gap: 12 }}>
        <ActivityIndicator />
        <Text style={{ color: "#9ca3af" }}>Finding nearby drop-off...</Text>
      </View>
    );
  }

  if (error) {
    return <Text style={{ color: "#ef4444" }}>{error}</Text>;
  }

  if (!rows.length) {
    return (
      <Text style={{ color: "#9ca3af" }}>No facilities found nearby.</Text>
    );
  }

  return (
    <View style={{ marginHorizontal: -8 }}>
      <FlatList
        data={rows}
        keyExtractor={(it) => it.id}
        renderItem={({ item }) => <FacilityCard {...item} />}
        ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
        contentContainerStyle={{ paddingVertical: 4 }}
      />
    </View>
  );
}

function CategoryPill({ value }: { value?: string }) {
  const v = (value ?? "").toLowerCase();
  const txt =
    v === "recyclable"
      ? "Recyclable"
      : v === "compostable"
        ? "Compostable"
        : v === "dropoff"
          ? "Drop Off"
          : v === "trash"
            ? "Trash"
            : "-";

  const color =
    v === "recyclable"
      ? "#0ea5e9"
      : v === "compostable"
        ? "#22c55e"
        : v === "dropoff"
          ? "#ef4444"
          : v === "trash"
            ? "#6b7280"
            : "#9ca3af";

  return (
    <View
      style={[
        styles.pill,
        { borderColor: color, backgroundColor: soft(color, 0.12) },
      ]}
    >
      <Text style={[styles.pillText, { color }]}>{txt}</Text>
    </View>
  );
}
type EsriFeature = {
  geometry: { x: number; y: number };
  attributes: Record<string, any>;
};
type EsriLayer = { id: number; features: EsriFeature[] };
type EsriLike = { layers: EsriLayer[] };

type NearestFacility = {
  attributes: Record<string, any>;
  coordMercator: { x: number; y: number };
  distanceMeters: number;
  distanceKm: number;
  distanceMiles: number;
};

const R = 6378137;

function lonLatToWebMercator(lon: number, lat: number) {
  const x = (lon * Math.PI) / 180;
  const y = (lat * Math.PI) / 180;
  return { x: R * x, y: R * Math.log(Math.tan(Math.PI / 4 + y / 2)) };
}
function webMercatorToLonLat(x: number, y: number) {
  const lon = (x / R) * (180 / Math.PI);
  const lat = (2 * Math.atan(Math.exp(y / R)) - Math.PI / 2) * (180 / Math.PI);
  return { lon, lat };
}
function hypot2(ax: number, ay: number, bx: number, by: number) {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.hypot(dx, dy);
}

function getNearestFacilitiesFromEsri(
  data: EsriLike,
  userLon: number,
  userLat: number,
  limit = 8,
): NearestFacility[] {
  const layer = data?.layers?.[0];
  if (!layer?.features?.length) return [];
  const u = lonLatToWebMercator(userLon, userLat);

  const out: NearestFacility[] = [];
  for (const f of layer.features) {
    const { x, y } = f.geometry || {};
    if (typeof x !== "number" || typeof y !== "number") continue;
    const d = hypot2(u.x, u.y, x, y);
    out.push({
      attributes: f.attributes ?? {},
      coordMercator: { x, y },
      distanceMeters: d,
      distanceKm: d / 1000,
      distanceMiles: d / 1609.344,
    });
  }
  out.sort((a, b) => a.distanceMeters - b.distanceMeters);
  return out.slice(0, Math.max(0, limit));
}

function inferCategory(infra?: string | null) {
  const s = (infra || "").toLowerCase();
  if (s.includes("hazard")) return "hazardous";
  if (s.includes("elect")) return "electronics";
  return "recycling";
}

function webMercatorToMapsQuery(
  x: number,
  y: number,
  fallbackAddress?: string,
) {
  const { lon, lat } = webMercatorToLonLat(x, y);
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    return { lat, lon } as const;
  }
  return { address: fallbackAddress } as const;
}

type FacilityRow = {
  id: string;
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

function mapsUrl(q?: FacilityRow["mapsQuery"]) {
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

function FacilityCard(props: FacilityRow) {
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
    <View style={[cardStyles.card, { borderColor: color.border }]}>
      {!!category && (
        <View
          style={[
            cardStyles.pill,
            { backgroundColor: color.bg, borderColor: color.border },
          ]}
        >
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[cardStyles.pillText, { color: color.text }]}
          >
            {category}
          </Text>
        </View>
      )}

      <Text style={cardStyles.title} numberOfLines={2}>
        {name}
      </Text>

      <View style={cardStyles.row}>
        <MapPin size={16} />
        <Text style={cardStyles.rowText} numberOfLines={2}>
          {addressLine}
        </Text>
      </View>

      <View style={cardStyles.rowWrap}>
        {!!distanceMiles && (
          <Text style={cardStyles.rowText}>
            {distanceMiles.toFixed(1)} miles
          </Text>
        )}
        {!!hours && (
          <Text
            style={[cardStyles.rowText, { marginLeft: 10 }]}
            numberOfLines={1}
          >
            {hours}
          </Text>
        )}
      </View>

      {!!phone && (
        <Text
          style={[cardStyles.rowText, cardStyles.link]}
          numberOfLines={1}
          onPress={() => Linking.openURL(`tel:${phone}`)}
        >
          {phone}
        </Text>
      )}

      {!!accepts && (
        <Text style={cardStyles.accepts} numberOfLines={2}>
          <Text style={cardStyles.acceptsLabel}>Accepts: </Text>
          {accepts}
        </Text>
      )}

      <View style={cardStyles.actions}>
        <TouchableOpacity
          onPress={onDirections}
          style={cardStyles.dirBtn}
          activeOpacity={0.85}
        >
          <Text style={cardStyles.dirText}>Directions</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onShare}
          style={cardStyles.iconBtn}
          hitSlop={10}
          activeOpacity={0.8}
        >
          <Text style={{ fontWeight: "700" }}>
            <ArrowUpRight />
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    position: "relative",
    borderWidth: 2,
    borderRadius: 16,
    padding: 14,
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
    flex: 1,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
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
  pillText: { fontSize: 12, fontWeight: "700", textTransform: "lowercase" },
});

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 10,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#14532d",
    textAlign: "center",
  },
  locRow: {
    marginTop: 6,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  locText: { color: "#065f46", fontWeight: "600" },

  segmentWrap: {
    marginTop: 14,
    alignSelf: "center",
    backgroundColor: "#eef2f7",
    borderRadius: 999,
    padding: 4,
    flexDirection: "row",
    gap: 6,
  },
  segment: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: "transparent",
  },
  segmentActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  segmentText: { color: "#6b7280", fontWeight: "700" },
  segmentTextActive: { color: "#111827" },

  contentBox: {
    backgroundColor: "white",
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  body: { color: "#374151", flex: 1, lineHeight: 20 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    backgroundColor: "#10b981",
  },

  table: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    overflow: "hidden",
  },
  tr: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eef2f7",
  },
  trAlt: { backgroundColor: "#fafafa" },
  trHead: { backgroundColor: "#f5f7f9" },
  th: { fontWeight: "800", color: "#111827" },
  td: { color: "#111827", fontWeight: "600" },

  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: { fontWeight: "800", fontSize: 12 },
});
