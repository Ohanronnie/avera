import { ImageSourcePropType } from "react-native";

export type OnboardingSlide = {
  id: number;
  accent: string;
  eyebrow: string;
  title: string;
  description: string;
  image: ImageSourcePropType;
};

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: 0,
    accent: "#2563EB",
    eyebrow: "Buy with confidence",
    title: "Find goods and crypto deals from real people near you.",
    description:
      "Browse peer-to-peer listings for physical goods and crypto assets in one place. No middlemen, no noise.",
    image: require("@/assets/images/onboarding/1.png"),
  },
  {
    id: 1,
    accent: "#2563EB",
    eyebrow: "Sell anything",
    title: "List your goods or crypto and reach ready buyers fast.",
    description:
      "Post a listing in seconds, set your price, accept offers, and trade on your terms without a clunky flow.",
    image: require("@/assets/images/onboarding/2.jpg"),
  },
  {
    id: 2,
    accent: "#2563EB",
    eyebrow: "Trade safely",
    title: "Every trade is protected by built-in escrow.",
    description:
      "Funds stay secure until both sides confirm the deal, so transactions feel transparent and a lot less risky.",
    image: require("@/assets/images/onboarding/3.jpg"),
  },
];
