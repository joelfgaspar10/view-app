import { useState, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { hideAsync } from "expo-splash-screen";

const videoSource = require("../assets/splash.mp4");

type Props = {
  onComplete: (status: boolean) => void;
};

export default function Splash({ onComplete }: Props) {
  const [hasHiddenSplash, setHasHiddenSplash] = useState(false);

  const player = useVideoPlayer(videoSource, (player) => {
    player.loop = false;
    player.play();
  });

  useEffect(() => {
    // Fallback timeout - if video doesn't complete in 10 seconds, move on
    const fallbackTimeout = setTimeout(() => {
      onComplete(true);
    }, 10000);

    // Listen for when the video is loaded
    const statusListener = player.addListener(
      "statusChange",
      async (status) => {
        if (status.status === "readyToPlay" && !hasHiddenSplash) {
          await hideAsync();
          setHasHiddenSplash(true);
        }

        if (status.status === "idle" && hasHiddenSplash) {
          // Video finished playing
          clearTimeout(fallbackTimeout);
          onComplete(true);
        }
      }
    );

    // Listen for playback completion
    const playToEndListener = player.addListener("playToEnd", () => {
      clearTimeout(fallbackTimeout);
      onComplete(true);
    });

    // Cleanup listeners and timeout
    return () => {
      clearTimeout(fallbackTimeout);
      statusListener?.remove();
      playToEndListener?.remove();
    };
  }, [player, onComplete, hasHiddenSplash]);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: "#000" }]}>
      <VideoView
        style={StyleSheet.absoluteFill}
        player={player}
        allowsPictureInPicture={false}
        nativeControls={false}
        contentFit="cover"
      />
    </View>
  );
}
