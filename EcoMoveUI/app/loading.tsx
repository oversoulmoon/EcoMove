import { useEffect } from "react";
import { router } from "expo-router";
import LoadingScreen from "@/components/ui/loading_screen";

export default function Loading() {
  useEffect(() => {
    const bootstrap = async () => {
      // set wait time...
      await new Promise((r) => setTimeout(r, 2500));

      router.replace("/scanner");
    };
    bootstrap();
  }, []);

  return <LoadingScreen />;
}
