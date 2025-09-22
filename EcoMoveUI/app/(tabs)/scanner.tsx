import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Dimensions, Platform } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { TouchableOpacity } from "react-native";
import { CameraIcon } from "lucide-react-native";
import { useRouter } from "expo-router";
import { BASE_URL } from "@/constants/server";
// import { clearAllCapturedData } from "@/components/capture_logs";
import { useIsFocused } from "@react-navigation/native";
import { AppState } from "react-native";

type Box = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  confidence: number;
  label: string;
  class_id: number;
};
type DetectResponse = { width: number; height: number; boxes: Box[] };

export default function ScanLiveScreen() {
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const camRef = useRef<CameraView>(null);
  const BOTTOM_BAR_HEIGHT = 78;
  const GAP_ABOVE_BAR = 50; 
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [imgW, setImgW] = useState<number | null>(null);
  const [imgH, setImgH] = useState<number | null>(null);
  const isBusyRef = useRef(false);
  const router = useRouter();
  const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));
  const intervalRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  // useEffect(() => {
  //   const run = async () => {
  //     try {
  //       await clearAllCapturedData({ deleteImages: true, removeLogFile: true });
  //     } catch (e) {
  //       console.warn("Failed to clear captured data:", e);
  //     }
  //   };
  //   run();
  // }, []);

  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );
  useEffect(() => {
    if (!permission) return;
    if (!permission.granted) requestPermission();
  }, [permission]);

  const tick = useCallback(async () => {
    for (let i = 0; i < 3 && isBusyRef.current; i++) {
      await wait(100);
    }
    if (!camRef.current || isBusyRef.current) return;

    isBusyRef.current = true;
    try {
      if (!mountedRef.current) return;
      const photo = await camRef.current.takePictureAsync({
        quality: 0.5,
        skipProcessing: true,
      });

      const form = new FormData();
      form.append("file", {
        uri: photo.uri,
        name: "frame.jpg",
        type: "image/jpeg",
      } as any);

      const res = await fetch(`${BASE_URL}/detect`, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: form,
      });
      if (res.ok) {
        const json: DetectResponse = await res.json();
        setImgW(json.width);
        setImgH(json.height);
        setBoxes(json.boxes ?? []);
      }
    } finally {
      isBusyRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (isFocused) {
      resumeTicker();
    } else {
      pauseTicker();
    }
    return () => pauseTicker();
  }, [isFocused, tick]);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        if (isFocused) resumeTicker();
      } else {
        pauseTicker();
      }
    });
    return () => sub.remove();
  }, [isFocused, tick]);
  const pauseTicker = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };
  const resumeTicker = () => {
    if (!intervalRef.current) {
      intervalRef.current = setInterval(tick, 1000);
    }
  };
  if (!permission)
    return (
      <View style={styles.center}>
        <Text>Loading camera...</Text>
      </View>
    );
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={{ textAlign: "center", marginBottom: 12 }}>
          We need your permission to show the camera.
        </Text>
        <Text onPress={requestPermission} style={styles.link}>
          Grant permission
        </Text>
      </View>
    );
  }
  const handleScan = async () => {
    for (let i = 0; i < 3 && isBusyRef.current; i++) {
      await wait(100);
    }
    if (!camRef.current) return;

    pauseTicker();

    isBusyRef.current = true;
    try {
      if (!mountedRef.current) return;

      const photo = await camRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: true,
      });

      router.push({ pathname: "/capture", params: { uri: photo.uri } });
    } catch (e) {
      resumeTicker();
    } finally {
      isBusyRef.current = false;
      resumeTicker();
    }
  };

  return (
    <View style={styles.container}>
      <CameraView ref={camRef} style={StyleSheet.absoluteFill} facing="back" />
      <BoxOverlay boxes={boxes} imageW={imgW ?? 1} imageH={imgH ?? 1} />
      <View
        style={[
          styles.buttonWrap,
          { bottom: BOTTOM_BAR_HEIGHT + GAP_ABOVE_BAR + 36 },
        ]}
      >
        <TouchableOpacity
          style={styles.scanButton}
          onPress={handleScan}
          activeOpacity={0.85}
          hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
        >
          <CameraIcon size={18} color="white" />
          <Text style={styles.scanText}> Scan Item</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function BoxOverlay({
  boxes,
  imageW,
  imageH,
}: {
  boxes: Box[];
  imageW: number;
  imageH: number;
}) {
  const { width: viewW, height: viewH } = Dimensions.get("window");
  const mapRect = (b: Box) => {
    const x1 = b.x1 * imageW;
    const y1 = b.y1 * imageH;
    const x2 = b.x2 * imageW;
    const y2 = b.y2 * imageH;

    let scale: number = Math.min(viewW / imageW, viewH / imageH);
    return {
      left: x1 * scale,
      top: y1 * scale,
      width: (x2 - x1) * scale,
      height: (y2 - y1) * scale,
    };
  };

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {boxes.map((b, i) => {
        const r = mapRect(b);
        if (!isFinite(r.left) || !isFinite(r.top)) return null;
        return (
          <View key={`${i}-${b.label}`} style={[styles.box, r]}>
            <Text
              style={styles.tag}
              numberOfLines={1}
              ellipsizeMode="tail"
              adjustsFontSizeToFit
              minimumFontScale={0.6}
              allowFontScaling={false}
            >
              {b.label} {(b.confidence * 100).toFixed(0)}%
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  link: { color: "#2f6cff", fontWeight: "600" },
  box: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "#00FF00",
  },
  tag: {
    position: "absolute",
    top: -18,
    left: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    color: "white",
    fontSize: 12,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  buttonWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10b981",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  scanText: { color: "white", fontWeight: "700", fontSize: 16 },
});
