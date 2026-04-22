import { parsePhoneNumberFromString } from "libphonenumber-js";
import * as z from "zod";

import { USERNAME_ERROR, USERNAME_REGEX } from "./constants";

export const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  username: z.string().regex(USERNAME_REGEX, USERNAME_ERROR),
  bio: z.string().max(160, "Bio must be 160 characters or less").optional(),
  phoneNumber: z.string().min(1, "Phone number is required"),
  state: z.string().min(1, "State is required"),
  city: z.string().min(1, "City is required"),
  address: z.string().min(1, "House address is required"),
});

export const formatAndValidatePhone = (countryCode: string, raw: string) => {
  try {
    const cleaned = raw.trim().replace(/^0+/, "");
    const parsed = parsePhoneNumberFromString(`${countryCode}${cleaned}`);

    if (parsed?.isValid()) {
      return { valid: true, e164: parsed.number };
    }
  } catch {}

  return { valid: false, e164: "" };
};
