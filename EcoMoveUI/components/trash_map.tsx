import * as Location from "expo-location";

export type Category = "recyclable" | "compostable" | "trash" | "dropoff";

import stateItemsRaw from "./trash.json";

type StateStatus = "Recyclable" | "Compost" | "Trash" | "Special handling";
type StateItemsEntry = {
  State: string;
  Items: { id: number; name: string; status: StateStatus }[];
};

const toKey = (s: string) => s.trim().toLowerCase();

const NAME_TO_ABBR: Record<string, string> = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
};
const ABBR_TO_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(NAME_TO_ABBR).map(([name, abbr]) => [
    abbr,
    name
      .split(" ")
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join(" "),
  ]),
);

const statusToCategory = (s: StateStatus): Category =>
  s === "Recyclable"
    ? "recyclable"
    : s === "Compost"
      ? "compostable"
      : s === "Special handling"
        ? "dropoff"
        : "trash";

const STATE_TABLE: Record<
  string,
  { byId: Record<number, Category>; byName: Map<string, Category> }
> = {};
for (const entry of stateItemsRaw as StateItemsEntry[]) {
  const byId: Record<number, Category> = {};
  const byName = new Map<string, Category>();
  for (const it of entry.Items) {
    const cat = statusToCategory(it.status);
    byId[it.id] = cat;
    byName.set(toKey(it.name), cat);
  }
  const fullKey = toKey(entry.State);
  STATE_TABLE[fullKey] = { byId, byName };
  const abbr = NAME_TO_ABBR[fullKey];
  if (abbr) STATE_TABLE[abbr.toLowerCase()] = { byId, byName };
}

export async function getCurrentState(): Promise<string | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return null;

    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const places = await Location.reverseGeocodeAsync({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    });
    const p = places[0];
    if (!p) return null;

    const full = p.region || p.subregion;
    if (!full) return null;

    const abbr = NAME_TO_ABBR[toKey(full)];
    return abbr ?? full;
  } catch {
    return null;
  }
}

export async function lookup(
  item: number | string,
): Promise<Category | undefined> {
  const state = await getCurrentState();
  if (!state) return undefined;
  return getCategoryForState(item, state);
}

export function getCategoryForState(
  item: number | string,
  state: string,
): Category | undefined {
  if (!state) return undefined;
  const key = toKey(ABBR_TO_NAME[state.toUpperCase()] ?? state);
  const table = STATE_TABLE[key] ?? STATE_TABLE[state.toLowerCase()];
  if (!table) return undefined;
  if (typeof item === "number") {
    return table.byId[item];
  }
  return table.byName.get(toKey(String(item)));
}
export function isSupportedState(state: string) {
  const key = toKey(ABBR_TO_NAME[state.toUpperCase()] ?? state);
  return Boolean(STATE_TABLE[key] || STATE_TABLE[state.toLowerCase()]);
}
export function listSupportedStates(): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const [k] of Object.entries(STATE_TABLE)) {
    if (k.length === 2) continue;
    const proper = ABBR_TO_NAME[NAME_TO_ABBR[k]] ?? k;
    if (!seen.has(proper)) {
      seen.add(proper);
      out.push(proper);
    }
  }
  return out.sort();
}
