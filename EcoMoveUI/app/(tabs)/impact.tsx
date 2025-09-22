import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { readCaptureLog } from "@/components/capture_logs";
import {
  Flame,
  Recycle,
  Target,
  Trophy,
  TrendingUp,
} from "lucide-react-native";
import Spacer from "@/components/spacer";
import { WEEKLY_GOAL } from "@/constants/server";

const COUNT_FOR_WEEK = (e: CaptureEntry) =>
  (e?.categories?.recyclable ?? 0) + (e?.categories?.compostable ?? 0);

type Category = "recyclable" | "compostable" | "trash" | "dropoff";
type CaptureEntry = {
  timestamp: string;
  total: number;
  items: { label: string; count: number; category: Category | null }[];
  categories: Record<Category, number>;
  sourceUri?: string | null;
};

export default function ImpactScreen() {
  const [entries, setEntries] = useState<CaptureEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await readCaptureLog<CaptureEntry>();
      setEntries(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const {
    streakDays,
    totalRecycled,
    totalCompost,
    weeklyCount,
    weeklyPct,
    weeklyRemaining,
  } = useMemo(() => computeImpact(entries), [entries]);
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      <Text style={styles.title}>Your Impact</Text>
      <Text style={styles.subtitle}>
        Track your environmental contributions
      </Text>

      <View style={styles.row}>
        <View style={[styles.card, styles.cardLeft]}>
          <View style={styles.iconWrap}>
            <Flame size={20} color="#f97316" />
          </View>
          <Text style={styles.bigNumber}>{streakDays}</Text>
          <Text style={styles.cardLabel}>Day Streak</Text>
        </View>

        <View style={[styles.card, styles.cardRight]}>
          <View style={styles.iconWrap}>
            <Recycle size={20} color="#16a34a" />
          </View>
          <Text style={[styles.bigNumber, { color: "#16a34a" }]}>
            {totalRecycled}
          </Text>
          <Text style={styles.cardLabel}>Items Recycled</Text>
        </View>
      </View>

      <View style={styles.goalCard}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <Target size={18} color="#111827" />
          <Text style={[styles.goalTitle, { marginLeft: 8 }]}>Weekly Goal</Text>
        </View>

        <View style={styles.goalRow}>
          <Text style={styles.goalCount}>
            {weeklyCount} of {WEEKLY_GOAL} items
          </Text>
          <Text style={styles.goalPct}>{Math.round(weeklyPct * 100)}%</Text>
        </View>

        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min(weeklyPct, 1) * 100}%` },
            ]}
          />
        </View>

        <Text style={styles.goalHint}>
          {weeklyRemaining > 0
            ? `${weeklyRemaining} more items to reach your goal!`
            : "Goal reached-nice work!"}
        </Text>
      </View>

      <AchievementsSection
        streakDays={streakDays}
        totalRecycled={totalRecycled}
        totalCompost={totalCompost}
        communityPosts={0}
      />
      <RecentScans entries={entries} />
      <Spacer bottomBarHeight={78} />
    </ScrollView>
  );
}
function AchievementsSection({
  streakDays,
  totalRecycled,
  totalCompost,
  communityPosts = 0,
}: {
  streakDays: number;
  totalRecycled: number;
  totalCompost: number;
  communityPosts?: number;
}) {
  const ECO_TARGET = 100;
  const GREEN_THUMB_TARGET = 25;
  const COMMUNITY_TARGET = 5;

  const firstStepsUnlocked = totalRecycled + totalCompost > 0;
  const weekWarriorUnlocked = streakDays >= 7;
  const ecoChampionUnlocked = totalRecycled >= ECO_TARGET;
  const greenThumbProgress = Math.min(totalCompost, GREEN_THUMB_TARGET);
  const greenThumbUnlocked = totalCompost >= GREEN_THUMB_TARGET;
  const communityProgress = Math.min(communityPosts, COMMUNITY_TARGET);
  const communityUnlocked = communityPosts >= COMMUNITY_TARGET;

  const Card = ({
    title,
    subtitle,
    unlocked,
    progress,
    target,
    icon,
    accent = "#111827",
  }: {
    title: string;
    subtitle: string;
    unlocked: boolean;
    progress?: number;
    target?: number;
    icon: React.ReactNode;
    accent?: string;
  }) => {
    const pct = target ? Math.min(1, (progress ?? 0) / target) : 1;
    return (
      <View
        style={[
          styles.achCard,
          unlocked ? styles.achCardOn : styles.achCardOff,
        ]}
      >
        <View
          style={[
            styles.achIcon,
            { backgroundColor: unlocked ? "#f3f4f6" : "#f9fafb" },
          ]}
        >
          {icon}
        </View>
        <Text
          style={[styles.achTitle, { color: unlocked ? "#111827" : "#9ca3af" }]}
        >
          {title}
        </Text>
        <Text
          style={[styles.achSub, { color: unlocked ? "#6b7280" : "#9ca3af" }]}
        >
          {subtitle}
        </Text>

        {target ? (
          <>
            <View style={styles.achBarBg}>
              <View
                style={[
                  styles.achBarFill,
                  {
                    width: `${pct * 100}%`,
                    backgroundColor: unlocked ? accent : "#111827",
                  },
                ]}
              />
            </View>
            <Text
              style={[
                styles.achHint,
                { color: unlocked ? "#6b7280" : "#9ca3af" },
              ]}
            >
              {progress}/{target}
            </Text>
          </>
        ) : (
          <Text style={[styles.achBadge, { color: "#10b981" }]}>
            {unlocked ? "Unlocked" : "Locked"}
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.achSection}>
      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}
      >
        <Text style={styles.achHeader}>
          <Trophy size={20} color="#baf713ff" />
          Achievements
        </Text>
      </View>

      <View style={styles.achGrid}>
        <Card
          title="First Steps"
          subtitle="Complete your first scan"
          unlocked={firstStepsUnlocked}
          icon={<Target size={18} color="#9333ea" />}
          accent="#9333ea"
        />
        <Card
          title="Week Warrior"
          subtitle="Maintain a 7-day streak"
          unlocked={weekWarriorUnlocked}
          icon={<Flame size={18} color="#f97316" />}
          accent="#f97316"
        />
        <Card
          title="Eco Champion"
          subtitle={`Recycle ${ECO_TARGET} items`}
          unlocked={ecoChampionUnlocked}
          progress={totalRecycled}
          target={ECO_TARGET}
          icon={<Recycle size={18} color="#16a34a" />}
          accent="#16a34a"
        />
        <Card
          title="Green Thumb"
          subtitle={`Compost ${GREEN_THUMB_TARGET} items`}
          unlocked={greenThumbUnlocked}
          progress={greenThumbProgress}
          target={GREEN_THUMB_TARGET}
          icon={<Recycle size={18} color="#16a34a" />}
          accent="#16a34a"
        />
        <Card
          title="Community Helper"
          subtitle={`Post ${COMMUNITY_TARGET} items on swap board`}
          unlocked={communityUnlocked}
          progress={communityProgress}
          target={COMMUNITY_TARGET}
          icon={<Target size={18} color="#111827" />}
          accent="#111827"
        />
      </View>
    </View>
  );
}

function computeImpact(entries: CaptureEntry[]) {
  const totalRecycled = entries.reduce(
    (s, e) => s + (e?.categories?.recyclable ?? 0),
    0,
  );
  const totalCompost = entries.reduce(
    (s, e) => s + (e?.categories?.compostable ?? 0),
    0,
  );

  const byDay = new Map<string, number>();
  for (const e of entries) {
    const key = dateKey(new Date(e.timestamp));
    byDay.set(key, (byDay.get(key) || 0) + 1);
  }
  const streakDays = computeStreak(byDay);

  const { start, end } = weekWindow(new Date());
  const weeklyCount = entries
    .filter((e) => {
      const t = new Date(e.timestamp).getTime();
      return t >= start.getTime() && t <= end.getTime();
    })
    .reduce((sum, e) => sum + COUNT_FOR_WEEK(e), 0);

  const weeklyPct = WEEKLY_GOAL > 0 ? weeklyCount / WEEKLY_GOAL : 0;
  const weeklyRemaining = Math.max(WEEKLY_GOAL - weeklyCount, 0);

  return {
    totalRecycled,
    totalCompost,
    streakDays,
    weeklyCount,
    weeklyPct,
    weeklyRemaining,
  };
}

function dateKey(d: Date) {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function computeStreak(dayMap: Map<string, number>) {
  let streak = 0;
  const today = new Date();
  let cursor = new Date(today);
  while (true) {
    const key = dateKey(cursor);
    if (dayMap.has(key)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

const START_DOW = 1;
function weekWindow(now: Date) {
  const d = new Date(now);
  const currentDOW = d.getDay(); 
  const diff = (currentDOW - START_DOW + 7) % 7;
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  start.setDate(d.getDate() - diff);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}
function RecentScans({
  entries,
  maxRows = 5,
}: {
  entries: CaptureEntry[];
  maxRows?: number;
}) {
  const rows = React.useMemo(() => {
    const out: { label: string; category: Category | null; ts: number }[] = [];
    const sorted = [...entries].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    for (const e of sorted) {
      for (const it of e.items) {
        out.push({
          label: it.label,
          category: it.category,
          ts: new Date(e.timestamp).getTime(),
        });
        if (out.length >= maxRows) break;
      }
      if (out.length >= maxRows) break;
    }
    return out;
  }, [entries, maxRows]);

  const CATEGORY_COLORS: Record<Exclude<Category, null>, string> = {
    recyclable: "#0ea5e9",
    compostable: "#22c55e",
    trash: "#6b7280",
    dropoff: "#ef4444",
  };
  const soft = (hex: string, a = 0.18) => {
    const r = parseInt(hex.slice(1, 3), 16),
      g = parseInt(hex.slice(3, 5), 16),
      b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  };

  return (
    <View style={styles.recentCard}>
      <Text style={styles.recentTitle}>
        <TrendingUp size={20} color="#d33b3bff" /> Recent Scans
      </Text>
      {rows.length === 0 ? (
        <Text style={{ color: "#9ca3af" }}>No scans yet.</Text>
      ) : (
        rows.map((r, i) => {
          const color = r.category ? CATEGORY_COLORS[r.category] : "#9ca3af";
          return (
            <View key={i} style={styles.recentRow}>
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: r.category ? soft(color) : "#e5e7eb",
                    borderColor: r.category ? color : "#e5e7eb",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    { color: r.category ? color : "#6b7280" },
                  ]}
                >
                  {r.category ?? "unknown"}
                </Text>
              </View>
              <Text style={styles.recentLabel} numberOfLines={1}>
                {r.label}
              </Text>
              <Text style={styles.recentAgo}>{timeAgo(r.ts)}</Text>
            </View>
          );
        })
      )}
    </View>
  );
}

function timeAgo(ts: number) {
  const diff = Math.max(0, Date.now() - ts);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7fbf8" },
  content: { padding: 16, paddingBottom: 28 },
  title: { fontSize: 26, fontWeight: "800", color: "#111827" },
  subtitle: { color: "#6b7280", marginTop: 4, marginBottom: 14 },

  row: { flexDirection: "row", gap: 12 },
  recentCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginTop: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eef2f7",
  },
  recentLabel: { flex: 1, marginLeft: 10, color: "#111827", fontWeight: "600" },
  recentAgo: { color: "#9ca3af" },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: { fontWeight: "700", textTransform: "capitalize", fontSize: 12 },

  card: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardLeft: {},
  cardRight: {},
  achSection: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginTop: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  achHeader: { fontSize: 16, fontWeight: "700", color: "#111827" },
  achGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  achCard: {
    width: "48%",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
  },
  achCardOn: {
    borderColor: "#e5e7eb",
  },
  achCardOff: {
    borderColor: "#eef2f7",
    backgroundColor: "#f9fafb",
  },
  achIcon: {
    alignSelf: "flex-start",
    padding: 6,
    borderRadius: 9999,
    marginBottom: 6,
  },
  achTitle: { fontWeight: "800", fontSize: 14 },
  achSub: { fontSize: 12, marginTop: 2 },
  achBadge: { marginTop: 6, fontWeight: "700" },
  achBarBg: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
    overflow: "hidden",
    marginTop: 8,
    marginBottom: 6,
  },
  achBarFill: {
    height: "100%",
    borderRadius: 999,
  },
  achHint: { fontSize: 12, fontWeight: "600" },

  iconWrap: {
    alignSelf: "flex-start",
    backgroundColor: "#f3f4f6",
    borderRadius: 9999,
    padding: 8,
    marginBottom: 8,
  },
  bigNumber: {
    fontSize: 28,
    fontWeight: "800",
    color: "#ef4444",
  },
  cardLabel: { color: "#6b7280", marginTop: 2 },

  goalCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginTop: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  goalTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  goalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  goalCount: { fontWeight: "700", color: "#111827" },
  goalPct: { color: "#6b7280" },

  progressBar: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
    overflow: "hidden",
    marginTop: 8,
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#111827",
  },
  goalHint: { color: "#6b7280" },
});
