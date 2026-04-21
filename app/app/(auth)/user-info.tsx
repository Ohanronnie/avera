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
import { Ionicons } from "@expo/vector-icons";
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
const PROFILE_STEPS = [
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
];

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
  const [currentStep, setCurrentStep] = useState(0);
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
        return false;
      }

      if (!USERNAME_REGEX.test(trimmedValue)) {
        cancelUsernameCheck();
        return false;
      }

      if (
        trimmedValue === inFlightUsernameRef.current ||
        trimmedValue === lastCheckedUsernameRef.current
      ) {
        return !username.error;
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
          return false;
        } else {
          username.setError(null);
          return true;
        }
      } catch (error: any) {
        if (error?.code === "ERR_CANCELED" || error?.name === "CanceledError") {
          return false;
        }
        // Silent: validate again on submit
        return true;
      } finally {
        if (requestId === usernameRequestRef.current) {
          inFlightUsernameRef.current = "";
          usernameAbortRef.current = null;
          setCheckingUsername(false);
        }
      }
    },
    [cancelUsernameCheck, username.error, username.setError],
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
      const response = e?.response?.data;
      const fieldErrors = response?.fieldErrors;
      console.log(fieldErrors);
      if (response?.code === "USERNAME_TAKEN") {
        username.setError(response.message || "Username is already taken");
        setCurrentStep(1);
        return;
      }

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

  const validateCurrentStep = async () => {
    if (currentStep === 0) {
      const nextFirstNameError = firstName.value.trim()
        ? null
        : "First name is required";
      const nextLastNameError = lastName.value.trim()
        ? null
        : "Last name is required";

      firstName.setError(nextFirstNameError);
      lastName.setError(nextLastNameError);

      return !nextFirstNameError && !nextLastNameError;
    }

    if (currentStep === 1) {
      const trimmedUsername = username.value.trim();

      if (!USERNAME_REGEX.test(trimmedUsername)) {
        username.setError(
          "Username must start with a letter and be 4–15 characters (letters, numbers, underscores)",
        );
        return false;
      }

      return await checkUsernameAvailability(trimmedUsername);
    }

    if (currentStep === 2) {
      const bioCheck = z
        .string()
        .max(160, "Bio must be 160 characters or less")
        .safeParse(bio.value.trim());

      bio.setError(bioCheck.success ? null : bioCheck.error.issues[0].message);
      return bioCheck.success;
    }

    const phoneCheck = formatAndValidatePhone(countryCode, phone.value);
    phone.setError(phoneCheck.valid ? null : "Enter a valid phone number");
    return phoneCheck.valid;
  };

  const handleNext = async () => {
    const valid = await validateCurrentStep();
    if (!valid) return;

    if (currentStep < PROFILE_STEPS.length - 1) {
      setCurrentStep((step) => step + 1);
      return;
    }

    handleSubmit();
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((step) => step - 1);
      return;
    }

    router.back();
  };

  const activeStep = PROFILE_STEPS[currentStep];
  const isLastStep = currentStep === PROFILE_STEPS.length - 1;

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#0A0A0A]">
      <View className="px-4 pt-4">
        <Pressable
          onPress={handleBack}
          className="h-11 w-11 items-center justify-center rounded-2xl border border-gray-100 bg-gray-50 dark:border-white/5 dark:bg-white/5"
          style={({ pressed }) => [
            {
              transform: [{ scale: pressed ? 0.97 : 1 }],
              borderColor: pressed
                ? "#3b82f6"
                : isDark
                  ? "rgba(255,255,255,0.08)"
                  : "#E5E7EB",
            },
          ]}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={isDark ? "white" : "#181718"}
          />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="flex-grow px-4 pb-8 pt-7">
          <View className="mb-7 flex-row gap-x-2">
            {PROFILE_STEPS.map((step, index) => (
              <View
                key={step.title}
                className={`h-2 flex-1 rounded-full ${
                  index <= currentStep
                    ? "bg-brand"
                    : "bg-gray-100 dark:bg-white/10"
                }`}
              />
            ))}
          </View>

          <View className="max-w-[88%] mb-5">
            <Text className="mb-2 text-sm font-bold uppercase tracking-widest text-brand">
              Step {currentStep + 1} of {PROFILE_STEPS.length}
            </Text>
            <Text
              size="4xl"
              className="mb-2 font-bold text-gray-900 dark:text-white"
            >
              {activeStep.title}
            </Text>
            <Text className="mb-2 text-base text-gray-500 dark:text-gray-400">
              {activeStep.subtitle}
            </Text>
          </View>

          {currentStep === 0 && (
            <View>
              {[
                { label: "First Name", field: firstName, placeholder: "John" },
                { label: "Last Name", field: lastName, placeholder: "Doe" },
              ].map(({ label, field, placeholder }) => (
                <View key={label} className="mt-4">
                  <Text className="mb-2 text-base font-medium text-gray-900 dark:text-white">
                    {label}
                  </Text>
                  <Input
                    className="h-14 rounded-xl border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-[#1A1A1A]"
                    variant="outline"
                    size="xl"
                  >
                    <InputField
                      placeholder={placeholder}
                      value={field.value}
                      onChangeText={field.setValue}
                      onFocus={() => field.setFocus(true)}
                      onBlur={() => field.setFocus(false)}
                      placeholderTextColor="#888"
                      className="h-14 px-4 text-sm text-black dark:text-white"
                      style={{
                        borderColor: field.focus
                          ? "#3b82f6"
                          : field.error
                            ? "#ef4444"
                            : isDark
                              ? DARK_FIELD_BORDER
                              : LIGHT_FIELD_BORDER,
                      }}
                    />
                  </Input>
                  {field.error && (
                    <Text className="text-red-500 mt-1">{field.error}</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {currentStep === 1 && (
            <View className="mt-4">
              <Text className="mb-2 text-base font-medium text-gray-900 dark:text-white">
                Username
              </Text>
              <Input
                className="h-14 rounded-xl border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-[#1A1A1A]"
                variant="outline"
                size="xl"
              >
                <InputField
                  placeholder="johndoe"
                  value={username.value}
                  onChangeText={username.setValue}
                  autoCapitalize="none"
                  spellCheck={false}
                  onFocus={() => username.setFocus(true)}
                  onBlur={() => {
                    username.setFocus(false);
                    if (usernameDebounceRef.current) {
                      clearTimeout(usernameDebounceRef.current);
                      usernameDebounceRef.current = null;
                    }
                    checkUsernameAvailability(username.value);
                  }}
                  placeholderTextColor="#888"
                  className="h-14 px-4 text-sm text-black dark:text-white"
                  style={{
                    borderColor: username.focus
                      ? "#3b82f6"
                      : username.error
                        ? "#ef4444"
                        : isDark
                          ? DARK_FIELD_BORDER
                          : LIGHT_FIELD_BORDER,
                  }}
                />
              </Input>
              {username.error && (
                <Text className="text-red-500 mt-1">{username.error}</Text>
              )}
              {checkingUsername && (
                <View className="mt-2 flex-row items-center">
                  <ActivityIndicator color="#2563EB" size="small" />
                  <Text className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                    Checking username...
                  </Text>
                </View>
              )}
            </View>
          )}

          {currentStep === 2 && (
            <View className="mt-4">
              <Text className="mb-2 text-base font-medium text-gray-900 dark:text-white">
                Bio
              </Text>
              <Input
                className="h-28 rounded-xl border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-[#1A1A1A]"
                variant="outline"
                size="xl"
              >
                <InputField
                  placeholder="Tell us a bit about yourself"
                  value={bio.value}
                  onChangeText={bio.setValue}
                  multiline
                  numberOfLines={4}
                  onFocus={() => bio.setFocus(true)}
                  onBlur={() => bio.setFocus(false)}
                  placeholderTextColor="#888"
                  className="px-4 pt-3 text-sm text-black dark:text-white"
                  style={{
                    borderColor: bio.focus
                      ? "#3b82f6"
                      : bio.error
                        ? "#ef4444"
                        : isDark
                          ? DARK_FIELD_BORDER
                          : LIGHT_FIELD_BORDER,
                    textAlignVertical: "top",
                  }}
                />
              </Input>
              <View className="mt-2 flex-row items-center justify-between">
                {bio.error ? (
                  <Text className="text-red-500">{bio.error}</Text>
                ) : (
                  <Text className="text-sm text-gray-500 dark:text-gray-400">
                    Optional, max 160 characters
                  </Text>
                )}
                <Text className="text-sm text-gray-400">
                  {bio.value.length}/160
                </Text>
              </View>
            </View>
          )}

          {currentStep === 3 && (
            <View className="mt-4">
              <Text className="mb-2 text-base font-medium text-gray-900 dark:text-white">
                Phone Number
              </Text>
              <Input
                className="h-14 rounded-xl bg-gray-50 dark:bg-[#1A1A1A]"
                variant="outline"
                size="xl"
                style={{
                  borderColor: phone.error
                    ? "#ef4444"
                    : isDark
                      ? DARK_FIELD_BORDER
                      : LIGHT_FIELD_BORDER,
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
          )}

          <View className="mt-auto pt-8">
            <Button
              size="xl"
              className="h-14 rounded-full bg-brand flex flex-row items-center justify-center"
              onPress={handleNext}
              disabled={loading || checkingUsername}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <ButtonText className="font-bold text-typography-white">
                  {isLastStep ? "Submit" : "Continue"}
                </ButtonText>
              )}
            </Button>

            {currentStep > 0 && (
              <Pressable onPress={handleBack} className="mt-4 py-3">
                <Text className="text-center text-sm font-bold text-gray-500 dark:text-gray-400">
                  Back
                </Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
