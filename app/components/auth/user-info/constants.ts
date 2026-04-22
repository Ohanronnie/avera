export const USERNAME_ERROR = "Invalid username. ";

export const USERNAME_REGEX = /^[A-Za-z](?!.*_$)[A-Za-z0-9_]{3,14}$/;

export const USERNAME_DEBOUNCE_MS = 500;

export const LIGHT_FIELD_BORDER = "#E2E8F0";
export const DARK_FIELD_BORDER = "#24262B";
export const LIGHT_FIELD_DIVIDER = "#D8E1EC";
export const DARK_FIELD_DIVIDER = "#2B2F36";

export const PROFILE_STEPS = [
  {
    title: "What's your name?",
    subtitle: "Use the name buyers and sellers will recognize on Avera.",
  },
  {
    title: "Choose a username",
    subtitle: "Pick a unique handle people can use to identify you.",
  },
  {
    title: "Add a short bio",
    subtitle: "Share a quick note about yourself. You can keep it simple.",
  },
  {
    title: "Add your phone number",
    subtitle: "This helps keep your account and marketplace activity secure.",
  },
  {
    title: "Where should orders reach you?",
    subtitle: "Add your delivery location. You can update this later.",
  },
] as const;

export const NIGERIA_STATE_OPTIONS = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
  "Federal Capital Territory",
] as const;
