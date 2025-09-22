import React from "react";
import { View, ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type SpacerProps = ViewProps & {
  height?: number;
  bottomBarHeight?: number;
  includeSafeArea?: boolean;
  extra?: number;
};

export default function Spacer({
  height,
  bottomBarHeight = 78,
  includeSafeArea = true,
  extra = 16,
  style,
  ...rest
}: SpacerProps) {
  const insets = useSafeAreaInsets();
  const h =
    height ?? bottomBarHeight + (includeSafeArea ? insets.bottom : 0) + extra;

  return (
    <View
      pointerEvents="none"
      style={[
        { height: h, width: "100%", backgroundColor: "transparent" },
        style,
      ]}
      {...rest}
    />
  );
}
