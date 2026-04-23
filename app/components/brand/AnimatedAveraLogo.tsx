import { useEffect, useRef } from "react";
import { Animated, Easing, ViewStyle } from "react-native";
import Svg, { ClipPath, Defs, G, Path } from "react-native-svg";

const AnimatedPath = Animated.createAnimatedComponent(Path);

const LOGO_PATH =
  "M384 191.710938 L576.0625 338.605469 L502.703125 576.285156 L265.296875 576.285156 L191.933594 338.605469 Z";
const LOGO_PATH_LENGTH = 1220;
const LOGO_VIEWBOX = "0 0 768 767.999994";
const LOGO_STROKE_WIDTH = 72;

type AnimatedAveraLogoProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
  play?: boolean;
  loop?: boolean;
  style?: ViewStyle;
};

export function AnimatedAveraLogo({
  size = 44,
  color = "#2563EB",
  strokeWidth = LOGO_STROKE_WIDTH,
  play = true,
  loop = false,
  style,
}: AnimatedAveraLogoProps) {
  const draw = useRef(new Animated.Value(play ? 0 : 1)).current;
  const pop = useRef(new Animated.Value(play ? 0 : 1)).current;

  useEffect(() => {
    if (!play) {
      draw.setValue(1);
      pop.setValue(1);
      return;
    }

    const drawIn = Animated.parallel([
      Animated.timing(draw, {
        toValue: 1,
        duration: 1500,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.spring(pop, {
        toValue: 1,
        damping: 12,
        stiffness: 120,
        mass: 0.8,
        useNativeDriver: true,
      }),
    ]);
    const drawLogo = loop
      ? Animated.sequence([
          drawIn,
          Animated.delay(240),
          Animated.timing(draw, {
            toValue: 0,
            duration: 1200,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: false,
          }),
          Animated.delay(160),
        ])
      : drawIn;

    const animation = loop ? Animated.loop(drawLogo) : drawLogo;
    animation.start();

    return () => {
      animation.stop();
    };
  }, [draw, loop, play, pop]);

  const strokeDashoffset = draw.interpolate({
    inputRange: [0, 1],
    outputRange: [LOGO_PATH_LENGTH, 0],
  });
  const scale = pop.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0.84, 1.04, 1],
  });
  const opacity = pop.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <Animated.View style={[{ opacity, transform: [{ scale }] }, style]}>
      <Svg
        width={size}
        height={size}
        viewBox={LOGO_VIEWBOX}
        preserveAspectRatio="xMidYMid meet"
      >
        <Defs>
          <ClipPath id="averaLogoClip">
            <Path d={LOGO_PATH} />
          </ClipPath>
        </Defs>
        <G clipPath="url(#averaLogoClip)">
          <AnimatedPath
            d={LOGO_PATH}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
            strokeLinejoin="miter"
            strokeDasharray={LOGO_PATH_LENGTH}
            strokeDashoffset={strokeDashoffset}
            strokeMiterlimit={4}
          />
        </G>
      </Svg>
    </Animated.View>
  );
}
