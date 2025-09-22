import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { appendCaptureLog } from "@/components/capture_logs";
import { Category, lookup } from "@/components/trash_map";
import { BASE_URL, FUN_FACTS, CATEGORY_COLORS } from "@/constants/server";
type Box = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  confidence: number;
  label: string;
  class_id: number;
};
type DetectResponse = {
  image: any;
  width: number;
  height: number;
  boxes: Box[];
};

const soft = (hex: string, alpha = 0.15) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

export default function CaptureScreen() {
  const router = useRouter();
  const { uri } = useLocalSearchParams<{ uri: string }>();
  const [annotatedUri, setAnnotatedUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [cats, setCats] = useState<Array<Category | undefined>>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const resolved = await Promise.all(
        boxes.map(async (b) => {
          const byState = await lookup(b.label || b.class_id);
          return byState;
        }),
      );
      if (!cancelled) setCats(resolved);
    })();

    return () => {
      cancelled = true;
    };
  }, [boxes]);
  const upload = async () => {
    if (!uri) {
      setError("No image URI provided.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", {
        uri,
        name: "capture.jpg",
        type: "image/jpeg",
      } as any);

      const res = await fetch(`${BASE_URL}/detect_image`, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: form,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Server ${res.status}: ${text || "Upload failed"}`);
      }

      const json: DetectResponse = await res.json();
      setBoxes(json.boxes ?? []);
      setAnnotatedUri(typeof json.image === "string" ? json.image : null);
    } catch (e: any) {
      console.log(e);
      setError(e?.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    upload();
  }, [uri]);

  const summary = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of boxes) map.set(b.label, (map.get(b.label) || 0) + 1);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [boxes]);

  const categoryCounts = useMemo(() => {
    const counts: Record<Category, number> = {
      recyclable: 0,
      compostable: 0,
      trash: 0,
      dropoff: 0,
    };
    for (const c of cats) if (c) counts[c] += 1;
    return counts;
  }, [cats]);

  const categoryOrder: Category[] = [
    "recyclable",
    "compostable",
    "trash",
    "dropoff",
  ];
  const pickRandom = (arr: any) =>
    arr[arr.length && Math.floor(Math.random() * arr.length)];

  const onDidIt = async () => {
    try {
      const entry = await appendCaptureLog({ boxes, sourceUri: uri });
      Alert.alert("Saved", `Saved ${entry.total} items to history.`);
    } catch (e: any) {
      Alert.alert("Save failed", e?.message ?? "Could not write log file.");
    }
  };
  return (
    <View style={styles.container}>
      {uri ? (
        <Image
          source={{ uri: annotatedUri ?? uri }}
          style={styles.preview}
          resizeMode="contain"
        />
      ) : (
        <View style={[styles.preview, styles.center]}>
          <Text>No image</Text>
        </View>
      )}

      <View style={styles.headerRow}>
        <Text style={styles.title}>Detections</Text>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.btnGhost}
          >
            <Text style={styles.btnGhostText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={upload} style={styles.btn}>
            <Text style={styles.btnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={[styles.center, { paddingVertical: 24 }]}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8, color: "#666" }}>Analyzing...</Text>
        </View>
      ) : error ? (
        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          <Text style={{ color: "#b91c1c", marginBottom: 8 }}>
            Error: {error}
          </Text>
          <Text style={{ color: "#666" }}>
            Make sure your phone and server are on the same network, and the
            server URL is correct.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.factCard}>
            <View style={styles.factHeader}>
              <Text style={styles.factTitle}>Fun fact</Text>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              ></View>
            </View>

            <Text style={styles.factText}>{pickRandom(FUN_FACTS)}</Text>
          </View>

          <View style={styles.tilesWrap}>
            {categoryOrder.map((cat) => {
              const count = categoryCounts[cat];
              if (!count) return null;
              const color = CATEGORY_COLORS[cat];
              return (
                <View
                  key={cat}
                  style={[
                    styles.tile,
                    { backgroundColor: soft(color, 0.18), borderColor: color },
                  ]}
                >
                  <View style={[styles.dot, { backgroundColor: color }]} />
                  <Text style={[styles.tileText, { color }]}>
                    {count} {cat}
                  </Text>
                </View>
              );
            })}
          </View>
          <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            <Text style={styles.summaryText}>
              Total: <Text style={{ fontWeight: "700" }}>{boxes.length}</Text>
            </Text>
            {summary.length > 0 && (
              <Text style={styles.summaryText}>
                {summary.map(([label, n]) => `${label}x${n}`).join("   ")}
              </Text>
            )}
          </View>
          <FlatList
            data={boxes}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
            renderItem={({ item, index }) => {
              const cat = cats[index];
              const color = cat ? CATEGORY_COLORS[cat] : "#10b981";
              return (
                <View style={styles.itemRow}>
                  <View style={[styles.badge, { backgroundColor: color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemLabel}>{item.label}</Text>
                    <Text style={styles.itemSub}>
                      {(item.confidence * 100).toFixed(1)}%
                      {cat ? `  -  ${cat}` : ""}
                    </Text>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={[styles.center, { paddingVertical: 24 }]}>
                <Text style={{ color: "#666" }}>No objects detected.</Text>
              </View>
            }
          />
          <View style={styles.saveBar}>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={onDidIt}
              activeOpacity={0.9}
            >
              <Text style={styles.saveText}>I did it!</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  preview: { width: "100%", aspectRatio: 3 / 2, backgroundColor: "black" },
  btnOutline: {
    borderWidth: 1,
    borderColor: "#10b981",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnOutlineText: { color: "#10b981", fontWeight: "700" },
  headerRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
    marginBottom: 20,
  },
  factCard: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#f9fafb",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
  },
  factHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  factTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: 0.3,
  },
  factText: { color: "#374151", lineHeight: 20, marginTop: 2 },

  shuffleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
  },
  shuffleText: { fontWeight: "700", color: "#111827" },

  factPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  factPillText: { fontWeight: "700", textTransform: "capitalize" },
  title: { fontSize: 18, fontWeight: "700" },
  saveBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    bottom: 30,
  },
  saveBtn: {
    backgroundColor: "#10b981",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: {
    color: "white",
    fontWeight: "800",
    fontSize: 16,
  },
  btn: {
    backgroundColor: "#10b981",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnText: { color: "white", fontWeight: "700" },
  btnGhost: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
  },
  btnGhostText: { color: "#111827", fontWeight: "600" },

  summaryText: { color: "#374151", marginTop: 4 },

  tilesWrap: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tile: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  tileText: { fontWeight: "700", textTransform: "capitalize" },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  badge: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#10b981" },
  itemLabel: { fontWeight: "700" },
  itemSub: { color: "#6b7280", marginTop: 2 },

  center: { alignItems: "center", justifyContent: "center" },
});
