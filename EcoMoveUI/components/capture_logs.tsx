import { Platform } from "react-native";
import * as FileSystem from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { lookup, Category } from "./trash_map";

export type Box = {
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  confidence?: number;
  label: string;
  class_id: number;
};

const USE_ASYNC = Platform.OS === "web" || !FileSystem.documentDirectory;
const KEY = "@captures_log";
const LOG_PATH =
  (FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? "") +
  "captures.json";

export const CAPTURE_LOG_PATH = USE_ASYNC ? null : LOG_PATH;

async function fsEnsureFile() {
  if (USE_ASYNC) return;
  const info = await FileSystem.getInfoAsync(LOG_PATH);
  if (!info.exists) {
    await FileSystem.writeAsStringAsync(LOG_PATH, "[]");
  }
}

async function readAll<T = any>(): Promise<T[]> {
  if (USE_ASYNC) {
    const txt = await AsyncStorage.getItem(KEY);
    return txt ? JSON.parse(txt) : [];
  }
  await fsEnsureFile();
  const txt = await FileSystem.readAsStringAsync(LOG_PATH);
  try {
    return JSON.parse(txt) as T[];
  } catch {
    return [];
  }
}

async function writeAll(entries: any[]) {
  const txt = JSON.stringify(entries, null, 2);
  if (USE_ASYNC) {
    await AsyncStorage.setItem(KEY, txt);
  } else {
    await FileSystem.writeAsStringAsync(LOG_PATH, txt);
  }
}

export async function readCaptureLog<T = any>(): Promise<T[]> {
  return readAll<T>();
}

export async function clearCaptureLog() {
  if (USE_ASYNC) {
    await AsyncStorage.setItem(KEY, "[]");
  } else {
    await FileSystem.writeAsStringAsync(LOG_PATH, "[]");
  }
}

export async function appendCaptureLog(params: {
  boxes: Box[];
  sourceUri?: string | null;
  extra?: Record<string, any>;
}) {
  const { boxes, sourceUri = null, extra = {} } = params;

  const countByLabel = new Map<string, number>();
  for (const b of boxes)
    countByLabel.set(b.label, (countByLabel.get(b.label) || 0) + 1);

  const catTotals: Record<Category, number> = {
    recyclable: 0,
    compostable: 0,
    trash: 0,
    dropoff: 0,
  };
  for (const b of boxes) {
    const c = (await lookup(b.label)) ?? (await lookup(b.class_id)) ?? null;
    if (c) catTotals[c as Category] += 1;
  }

  const items = await Promise.all(
    Array.from(countByLabel.entries()).map(async ([label, count]) => ({
      label,
      count,
      category: ((await lookup(label)) ?? null) as Category | null,
    })),
  );

  const entry = {
    timestamp: new Date().toISOString(),
    total: boxes.length,
    items,
    categories: catTotals,
    sourceUri,
    ...extra,
  };

  const entries = await readAll();
  entries.push(entry);
  await writeAll(entries);
  return entry;
}

export async function clearAllCapturedData(opts?: {
  deleteImages?: boolean;
  removeLogFile?: boolean;
}) {
  const { deleteImages = true, removeLogFile = false } = opts ?? {};

  let candidateUris: string[] = [];
  try {
    const entries = await readAll<any>();
    candidateUris = entries
      .map((e) => e?.sourceUri)
      .filter((u: any): u is string => typeof u === "string" && u.length > 0);
  } catch {}

  const isDeletableLocalFile = (uri: string) => {
    if (USE_ASYNC) return false;
    if (!uri) return false;
    const docDir = FileSystem.documentDirectory ?? "";
    const cacheDir = FileSystem.cacheDirectory ?? "";
    return (
      uri.startsWith("file://") &&
      (uri.startsWith(docDir) || uri.startsWith(cacheDir))
    );
  };

  let deletedImages = 0;
  if (deleteImages && !USE_ASYNC) {
    for (const uri of candidateUris) {
      if (!isDeletableLocalFile(uri)) continue;
      try {
        const info = await FileSystem.getInfoAsync(uri);
        if (info.exists) {
          await FileSystem.deleteAsync(uri, { idempotent: true });
          deletedImages += 1;
        }
      } catch {}
    }
  }

  if (USE_ASYNC) {
    if (removeLogFile) {
      await AsyncStorage.removeItem(KEY);
    } else {
      await AsyncStorage.setItem(KEY, "[]");
    }
  } else {
    if (removeLogFile) {
      try {
        await FileSystem.deleteAsync(LOG_PATH, { idempotent: true });
      } catch {}
    } else {
      await FileSystem.writeAsStringAsync(LOG_PATH, "[]");
    }
  }

  return {
    ok: true,
    deletedImages,
    logCleared: true,
    storage: USE_ASYNC ? "async" : "file",
    logPath: CAPTURE_LOG_PATH,
  };
}
