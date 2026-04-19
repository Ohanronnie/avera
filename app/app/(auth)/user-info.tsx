import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { axiosInstance } from "@/utils/axios";
import { useTheme } from "@/contexts/ThemeContext";

import { Button, ButtonText } from "@/components/ui/button";
import { Input, InputField } from "@/components/ui/input";
import { Text } from "@/components/ui/text";

// Validation
import * as z from "zod";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  username: z
    .string()
    .regex(
      /^[A-Za-z][A-Za-z0-9_]{3,14}$/,
      "Username must start with a letter and be 4–15 characters (letters, numbers, underscores)",
    ),
  bio: z.string().max(160, "Bio must be 160 characters or less").optional(),
  phoneNumber: z.string().min(1, "Phone number is required"),
});

const USERNAME_REGEX = /^[A-Za-z][A-Za-z0-9_]{3,14}$/;
const LIGHT_FIELD_BORDER = "#E2E8F0";
const DARK_FIELD_BORDER = "#24262B";
const LIGHT_FIELD_DIVIDER = "#D8E1EC";
const DARK_FIELD_DIVIDER = "#2B2F36";

// Helpers
const formatAndValidatePhone = (countryCode: string, raw: string) => {
  try {
    const cleaned = raw.trim().replace(/^0+/, "");
    const full = `${countryCode}${cleaned}`;
    const parsed = parsePhoneNumberFromString(full);
    if (parsed?.isValid()) return { valid: true, e164: parsed.number };
  } catch {}
  return { valid: false };
};

const useFormField = (initial = "") => {
  const [value, setValue] = useState(initial);
  const [focus, setFocus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return {
    value,
    setValue,
    focus,
    setFocus,
    error,
    setError,
  };
};

export default function UserFormScreen() {
  // Fields
  const firstName = useFormField("");
  const lastName = useFormField("");
  const username = useFormField("");
  const bio = useFormField("");
  const phone = useFormField("");

  const [countryCode] = useState("+234");
  const [loading, setLoading] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const { isDark } = useTheme();
  const usernameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const usernameRequestRef = useRef(0);
  const usernameAbortRef = useRef<AbortController | null>(null);
  const lastCheckedUsernameRef = useRef("");
  const inFlightUsernameRef = useRef("");

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      const token = await SecureStore.getItemAsync("accessToken");
      if (!token) router.replace("/(auth)/login");
    };
    checkAuth();
  }, []);

  const cancelUsernameCheck = useCallback(() => {
    if (usernameDebounceRef.current) {
      clearTimeout(usernameDebounceRef.current);
      usernameDebounceRef.current = null;
    }

    if (usernameAbortRef.current) {
      usernameAbortRef.current.abort();
      usernameAbortRef.current = null;
    }

    inFlightUsernameRef.current = "";
    setCheckingUsername(false);
  }, []);

  const checkUsernameAvailability = useCallback(
    async (value: string) => {
      const trimmedValue = value.trim();

      if (!trimmedValue) {
        cancelUsernameCheck();
        lastCheckedUsernameRef.current = "";
        username.setError(null);
        return;
      }

      if (!USERNAME_REGEX.test(trimmedValue)) {
        cancelUsernameCheck();
        return;
      }

      if (
        trimmedValue === inFlightUsernameRef.current ||
        trimmedValue === lastCheckedUsernameRef.current
      ) {
        return;
      }

      if (usernameAbortRef.current) {
        usernameAbortRef.current.abort();
      }

      const controller = new AbortController();
      usernameAbortRef.current = controller;
      inFlightUsernameRef.current = trimmedValue;

      const requestId = ++usernameRequestRef.current;

      try {
        setCheckingUsername(true);
        const { data } = await axiosInstance.get(
          `/auth/check-username?username=${encodeURIComponent(trimmedValue)}`,
          { signal: controller.signal },
        );

        if (requestId !== usernameRequestRef.current) {
          return;
        }

        lastCheckedUsernameRef.current = trimmedValue;
        if (!data.available) {
          username.setError("Username is already taken");
        } else {
          username.setError(null);
        }
      } catch (error: any) {
        if (error?.code === "ERR_CANCELED" || error?.name === "CanceledError") {
          return;
        }
        // Silent: validate again on submit
      } finally {
        if (requestId === usernameRequestRef.current) {
          inFlightUsernameRef.current = "";
          usernameAbortRef.current = null;
          setCheckingUsername(false);
        }
      }
    },
    [cancelUsernameCheck, username.setError],
  );

  useEffect(() => {
    const trimmedUsername = username.value.trim();

    if (usernameDebounceRef.current) {
      clearTimeout(usernameDebounceRef.current);
      usernameDebounceRef.current = null;
    }

    lastCheckedUsernameRef.current = "";

    if (usernameAbortRef.current) {
      usernameAbortRef.current.abort();
      usernameAbortRef.current = null;
    }
    inFlightUsernameRef.current = "";

    if (!trimmedUsername || !USERNAME_REGEX.test(trimmedUsername)) {
      setCheckingUsername(false);
      return;
    }

    usernameDebounceRef.current = setTimeout(() => {
      checkUsernameAvailability(trimmedUsername);
    }, 450);

    return () => {
      if (usernameDebounceRef.current) {
        clearTimeout(usernameDebounceRef.current);
        usernameDebounceRef.current = null;
      }
    };
  }, [username.value, checkUsernameAvailability]);

  useEffect(() => {
    return () => {
      cancelUsernameCheck();
    };
  }, [cancelUsernameCheck]);

  const handleSubmit = async () => {
    // Pre-validate
    const phoneCheck = formatAndValidatePhone(countryCode, phone.value);
    const payload = {
      firstName: firstName.value.trim(),
      lastName: lastName.value.trim(),
      username: username.value.trim(),
      bio: bio.value.trim(),
      phoneNumber: phoneCheck.e164 || "",
    };

    const parsed = profileSchema.safeParse(payload);

    if (!parsed.success || !phoneCheck.valid) {
      const issues: Record<string, string> = {};
      if (!phoneCheck.valid) issues.phoneNumber = "Enter a valid phone number";
      parsed.error?.issues.forEach((i) => {
        if (typeof i.path[0] === "string") {
          issues[i.path[0]] = i.message;
        }
      });

      firstName.setError(issues.firstName || null);
      lastName.setError(issues.lastName || null);
      username.setError(issues.username || null);
      bio.setError(issues.bio || null);
      phone.setError(issues.phoneNumber || null);
      return;
    }

    try {
      setLoading(true);
      await axiosInstance.put("/users/update-info", payload);
      router.replace("/(tabs)/home");
    } catch (e: any) {
      const fieldErrors = e?.response?.data?.fieldErrors;
      console.log(fieldErrors);
      if (fieldErrors) {
        firstName.setError(fieldErrors?.firstName?.[0] || null);
        lastName.setError(fieldErrors?.lastName?.[0] || null);
        username.setError(fieldErrors?.username?.[0] || null);
        bio.setError(fieldErrors?.bio?.[0] || null);
        phone.setError(fieldErrors?.phoneNumber?.[0] || null);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#0A0A0A]">
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="p-4 pt-16">
          <View className="max-w-[80%] mb-6">
            <Text
              size="4xl"
              className="mb-2 font-bold text-gray-900 dark:text-white"
            >
              Complete Your Profile
            </Text>
            <Text className="text-base text-gray-500 dark:text-gray-400">
              Add your first name, last name, and phone number to finish setting
              up your account.
            </Text>
          </View>

          {/* Reusable Input Field */}
          {[
            { label: "First Name", field: firstName, placeholder: "John" },
            { label: "Last Name", field: lastName, placeholder: "Doe" },
            {
              label: "Username",
              field: username,
              placeholder: "johndoe",
              onBlur: () => {
                if (usernameDebounceRef.current) {
                  clearTimeout(usernameDebounceRef.current);
                  usernameDebounceRef.current = null;
                }
                checkUsernameAvailability(username.value);
              },
            },
            {
              label: "Bio",
              field: bio,
              placeholder: "Tell us a bit about yourself (max 160 chars)",
              multiline: true,
              className: "pt-2",
            },
          ].map(
            ({ label, field, placeholder, multiline, onBlur, className }) => (
              <View key={label} className="mt-6">
                <Text className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
                  {label}
                </Text>
                <Input
                  className={`${multiline ? "h-28" : "h-14"} rounded-xl border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-[#1A1A1A]`}
                  variant="outline"
                  size="xl"
                >
                  <InputField
                    placeholder={placeholder}
                    value={field.value}
                    onChangeText={field.setValue}
                    multiline={multiline}
                    numberOfLines={multiline ? 4 : 1}
                    onFocus={() => field.setFocus(true)}
                    onBlur={() => {
                      field.setFocus(false);
                      onBlur?.();
                    }}
                    placeholderTextColor="#888"
                    className={`px-4 py-1 text-sm text-black dark:text-white ${className}`}
                    style={{
                      borderColor: field.focus
                        ? "#3b82f6"
                        : field.error
                          ? "#ef4444"
                          : isDark
                            ? DARK_FIELD_BORDER
                            : LIGHT_FIELD_BORDER,
                      textAlignVertical: multiline ? "top" : "center",
                    }}
                  />
                </Input>
                {field.error && (
                  <Text className="text-red-500 mt-1">{field.error}</Text>
                )}
                {label === "Username" && checkingUsername && (
                  <Text className="mt-1 text-gray-500 dark:text-gray-400">
                    Checking...
                  </Text>
                )}
              </View>
            ),
          )}

          {/* Phone number */}
          <View className="mt-6">
            <Text className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
              Phone Number
            </Text>
            <Input
              className="h-14 rounded-xl bg-gray-50 dark:bg-[#1A1A1A]"
              variant="outline"
              size="xl"
              style={{
                borderColor: isDark ? DARK_FIELD_BORDER : LIGHT_FIELD_BORDER,
              }}
            >
              <View className="flex-row items-center w-full">
                <Pressable
                  className="rounded-l-xl bg-gray-100 px-4 py-3 dark:bg-[#20242B]"
                  style={{
                    borderRightColor: isDark
                      ? DARK_FIELD_DIVIDER
                      : LIGHT_FIELD_DIVIDER,
                    borderRightWidth: 1,
                  }}
                >
                  <Text className="text-black dark:text-white">
                    {countryCode}
                  </Text>
                </Pressable>
                <InputField
                  keyboardType="phone-pad"
                  placeholder="8123456789"
                  value={phone.value}
                  onChangeText={phone.setValue}
                  onFocus={() => phone.setFocus(true)}
                  onBlur={() => phone.setFocus(false)}
                  placeholderTextColor="#888"
                  className="flex-1 h-14 px-4 text-black dark:text-white"
                  style={{
                    borderColor: phone.focus
                      ? "#3b82f6"
                      : phone.error
                        ? "#ef4444"
                        : isDark
                          ? DARK_FIELD_BORDER
                          : LIGHT_FIELD_BORDER,
                  }}
                />
              </View>
            </Input>
            {phone.error && (
              <Text className="text-red-500 mt-1">{phone.error}</Text>
            )}
          </View>

          <Button
            size="xl"
            className="mt-10 h-14 rounded-full bg-brand flex flex-row items-center justify-center"
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <ButtonText className="font-bold text-typography-white">
                Submit
              </ButtonText>
            )}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
