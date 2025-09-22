import React, { useEffect, useRef } from "react";
import { Leaf } from "lucide-react-native";
import { View, StyleSheet, Animated, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type Props = {
  appName?: string;
  onDone?: () => void;
  showMs?: number;
};

const LoadingScreen: React.FC<Props> = ({
  appName = "EcoMove",
  onDone,
  showMs = 1200,
}) => {
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(8)).current;

  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleTranslateY = useRef(new Animated.Value(6)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 6,
          tension: 130,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(150),
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslateY, {
          toValue: 0,
          duration: 260,
          useNativeDriver: true,
        }),
      ]),

      Animated.parallel([
        Animated.timing(subtitleOpacity, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(subtitleTranslateY, {
          toValue: 0,
          duration: 260,
          useNativeDriver: true,
        }),
      ]),

      Animated.delay(showMs),
    ]).start(() => {
      onDone?.();
    });
  }, [
    logoOpacity,
    logoScale,
    titleOpacity,
    titleTranslateY,
    subtitleOpacity,
    subtitleTranslateY,
    onDone,
    showMs,
  ]);

  return (
    <LinearGradient
      colors={["#05D660", "#00B64C"]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.container}
    >
      <View style={styles.center}>
        <Animated.View
          style={[
            styles.logoWrap,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <Leaf size={56} color="#00B64C" strokeWidth={2.4} />
        </Animated.View>

        <Animated.Text
          style={[
            styles.title,
            {
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
            },
          ]}
        >
          {appName}
        </Animated.Text>

        <Animated.Text
          style={[
            styles.subtitle,
            {
              opacity: subtitleOpacity,
              transform: [{ translateY: subtitleTranslateY }],
            },
          ]}
        >
          The Greener Move
        </Animated.Text>
      </View>
    </LinearGradient>
  );
};

export default LoadingScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 60,
  },
  logoWrap: {
    height: 120,
    width: 120,
    borderRadius: 60,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 10 },
    }),
  },
  title: {
    marginTop: 22,
    fontSize: 36,
    fontWeight: "600",
    letterSpacing: 0.5,
    color: "rgba(255,255,255,0.92)",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: 0.3,
    color: "rgba(255,255,255,0.7)",
  },
});
