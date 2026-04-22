import { useCallback, useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as z from "zod";

import { useTheme } from "@/contexts/ThemeContext";
import { axiosInstance } from "@/utils/axios";
import {
  AddressStep,
  BioStep,
  NameStep,
  PhoneStep,
  UsernameStep,
} from "@/components/auth/user-info/ProfileSteps";
import {
  BackButton,
  StepActions,
  StepHeader,
} from "@/components/auth/user-info/ProfileScaffold";
import {
  PROFILE_STEPS,
  USERNAME_DEBOUNCE_MS,
  USERNAME_ERROR,
  USERNAME_REGEX,
} from "@/components/auth/user-info/constants";
import { useFormField } from "@/components/auth/user-info/useFormField";
import {
  formatAndValidatePhone,
  profileSchema,
} from "@/components/auth/user-info/validation";

type UsernameStatus =
  | "idle"
  | "invalid"
  | "waiting"
  | "checking"
  | "available"
  | "taken";

export default function UserFormScreen() {
  const firstName = useFormField("");
  const lastName = useFormField("");
  const username = useFormField("");
  const bio = useFormField("");
  const phone = useFormField("");
  const state = useFormField("");
  const city = useFormField("");
  const address = useFormField("");

  const [countryCode] = useState("+234");
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");

  const { isDark } = useTheme();

  const usernameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const usernameAbortRef = useRef<AbortController | null>(null);
  const usernameRequestRef = useRef(0);
  const lastCheckedUsernameRef = useRef("");
  const lastUsernameAvailableRef = useRef(false);

  const clearUsernameDebounce = useCallback(() => {
    if (usernameDebounceRef.current) {
      clearTimeout(usernameDebounceRef.current);
      usernameDebounceRef.current = null;
    }
  }, []);

  const abortUsernameRequest = useCallback(() => {
    usernameRequestRef.current += 1;

    if (usernameAbortRef.current) {
      usernameAbortRef.current.abort();
      usernameAbortRef.current = null;
    }
  }, []);

  const checkUsernameAvailability = useCallback(
    async (value: string) => {
      const trimmedValue = value.trim();

      clearUsernameDebounce();

      if (!trimmedValue) {
        abortUsernameRequest();
        lastCheckedUsernameRef.current = "";
        lastUsernameAvailableRef.current = false;
        username.setError(null);
        setUsernameStatus("idle");
        return false;
      }

      if (!USERNAME_REGEX.test(trimmedValue)) {
        abortUsernameRequest();
        username.setError(USERNAME_ERROR);
        setUsernameStatus("invalid");
        return false;
      }

      if (trimmedValue === lastCheckedUsernameRef.current) {
        username.setError(
          lastUsernameAvailableRef.current ? null : "Username is already taken",
        );
        setUsernameStatus(
          lastUsernameAvailableRef.current ? "available" : "taken",
        );
        return lastUsernameAvailableRef.current;
      }

      abortUsernameRequest();

      const controller = new AbortController();
      const requestId = ++usernameRequestRef.current;
      usernameAbortRef.current = controller;
      setUsernameStatus("checking");

      try {
        const { data } = await axiosInstance.get(
          `/auth/check-username?username=${encodeURIComponent(trimmedValue)}`,
          { signal: controller.signal },
        );

        if (requestId !== usernameRequestRef.current) {
          return false;
        }

        const available = Boolean(data?.available);
        lastCheckedUsernameRef.current = trimmedValue;
        lastUsernameAvailableRef.current = available;
        username.setError(available ? null : "Username is already taken");
        setUsernameStatus(available ? "available" : "taken");
        return available;
      } catch (error: any) {
        if (error?.code === "ERR_CANCELED" || error?.name === "CanceledError") {
          return false;
        }

        const message =
          error?.response?.data?.message ||
          "Could not check username right now. Please try again.";

        username.setError(Array.isArray(message) ? message[0] : message);
        setUsernameStatus("idle");
        return false;
      } finally {
        if (requestId === usernameRequestRef.current) {
          usernameAbortRef.current = null;
        }
      }
    },
    [abortUsernameRequest, clearUsernameDebounce, username.setError],
  );

  useEffect(() => {
    const checkAuth = async () => {
      const token = await SecureStore.getItemAsync("accessToken");
      if (!token) router.replace("/(auth)/login");
    };

    checkAuth();
  }, []);

  useEffect(() => {
    const trimmedUsername = username.value.trim();

    clearUsernameDebounce();
    abortUsernameRequest();

    if (!trimmedUsername) {
      lastCheckedUsernameRef.current = "";
      lastUsernameAvailableRef.current = false;
      username.setError(null);
      setUsernameStatus("idle");
      return;
    }

    if (!USERNAME_REGEX.test(trimmedUsername)) {
      username.setError(USERNAME_ERROR);
      setUsernameStatus("invalid");
      return;
    }

    username.setError(null);

    if (trimmedUsername === lastCheckedUsernameRef.current) {
      username.setError(
        lastUsernameAvailableRef.current ? null : "Username is already taken",
      );
      setUsernameStatus(
        lastUsernameAvailableRef.current ? "available" : "taken",
      );
      return;
    }

    setUsernameStatus("waiting");
    usernameDebounceRef.current = setTimeout(() => {
      checkUsernameAvailability(trimmedUsername);
    }, USERNAME_DEBOUNCE_MS);

    return clearUsernameDebounce;
  }, [
    abortUsernameRequest,
    checkUsernameAvailability,
    clearUsernameDebounce,
    username.value,
    username.setError,
  ]);

  useEffect(() => {
    return () => {
      clearUsernameDebounce();
      abortUsernameRequest();
    };
  }, [abortUsernameRequest, clearUsernameDebounce]);

  const applyFieldErrors = (fieldErrors: Record<string, string[]>) => {
    firstName.setError(fieldErrors?.firstName?.[0] || null);
    lastName.setError(fieldErrors?.lastName?.[0] || null);
    username.setError(fieldErrors?.username?.[0] || null);
    bio.setError(fieldErrors?.bio?.[0] || null);
    phone.setError(fieldErrors?.phoneNumber?.[0] || null);
    state.setError(fieldErrors?.state?.[0] || null);
    city.setError(fieldErrors?.city?.[0] || null);
    address.setError(fieldErrors?.address?.[0] || null);
  };

  const handleSubmit = async () => {
    const phoneCheck = formatAndValidatePhone(countryCode, phone.value);
    const payload = {
      firstName: firstName.value.trim(),
      lastName: lastName.value.trim(),
      username: username.value.trim(),
      bio: bio.value.trim() || undefined,
      phoneNumber: phoneCheck.e164,
      state: state.value.trim(),
      city: city.value.trim(),
      address: address.value.trim(),
      country: "Nigeria",
    };

    const parsed = profileSchema.safeParse(payload);

    if (!parsed.success || !phoneCheck.valid) {
      const issues: Record<string, string> = {};
      if (!phoneCheck.valid) issues.phoneNumber = "Enter a valid phone number";
      parsed.error?.issues.forEach((issue) => {
        if (typeof issue.path[0] === "string") {
          issues[issue.path[0]] = issue.message;
        }
      });

      firstName.setError(issues.firstName || null);
      lastName.setError(issues.lastName || null);
      username.setError(issues.username || null);
      bio.setError(issues.bio || null);
      phone.setError(issues.phoneNumber || null);
      state.setError(issues.state || null);
      city.setError(issues.city || null);
      address.setError(issues.address || null);
      return;
    }

    try {
      setLoading(true);
      await axiosInstance.put("/users/update-info", payload);
      router.replace("/(tabs)/home");
    } catch (e: any) {
      const response = e?.response?.data;
      console.error("Error updating user info:", response || e);
      if (response?.code === "USERNAME_TAKEN") {
        username.setError(response.message || "Username is already taken");
        setUsernameStatus("idle");
        setCurrentStep(1);
        return;
      }

      if (response?.fieldErrors) {
        applyFieldErrors(response.fieldErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  const validateCurrentStep = async () => {
    if (currentStep === 0) {
      const firstNameError = firstName.value.trim()
        ? null
        : "First name is required";
      const lastNameError = lastName.value.trim()
        ? null
        : "Last name is required";

      firstName.setError(firstNameError);
      lastName.setError(lastNameError);

      return !firstNameError && !lastNameError;
    }

    if (currentStep === 1) {
      return await checkUsernameAvailability(username.value);
    }

    if (currentStep === 2) {
      const bioCheck = z
        .string()
        .max(160, "Bio must be 160 characters or less")
        .safeParse(bio.value.trim());

      bio.setError(bioCheck.success ? null : bioCheck.error.issues[0].message);
      return bioCheck.success;
    }

    if (currentStep === 3) {
      const phoneCheck = formatAndValidatePhone(countryCode, phone.value);
      phone.setError(phoneCheck.valid ? null : "Enter a valid phone number");
      return phoneCheck.valid;
    }

    const stateError = state.value.trim() ? null : "State is required";
    const cityError = city.value.trim() ? null : "City is required";
    const addressError = address.value.trim()
      ? null
      : "House address is required";

    state.setError(stateError);
    city.setError(cityError);
    address.setError(addressError);

    return !stateError && !cityError && !addressError;
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

  const checkingUsername = usernameStatus === "checking";
  const usernameAvailable = usernameStatus === "available";
  const actionDisabled =
    loading ||
    (currentStep === 1 &&
      (checkingUsername || usernameStatus === "waiting" || !!username.error));

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#0A0A0A]">
      <View className="px-4 pt-4">
        <BackButton isDark={isDark} onPress={handleBack} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="flex-grow px-4 pb-8 pt-7">
          <StepHeader currentStep={currentStep} />

          {currentStep === 0 && (
            <NameStep
              firstName={firstName}
              lastName={lastName}
              isDark={isDark}
            />
          )}

          {currentStep === 1 && (
            <UsernameStep
              username={username}
              checkingUsername={checkingUsername}
              usernameAvailable={usernameAvailable}
              isDark={isDark}
              onBlur={() => checkUsernameAvailability(username.value)}
            />
          )}

          {currentStep === 2 && <BioStep bio={bio} isDark={isDark} />}

          {currentStep === 3 && (
            <PhoneStep
              countryCode={countryCode}
              phone={phone}
              isDark={isDark}
            />
          )}

          {currentStep === 4 && (
            <AddressStep
              state={state}
              city={city}
              address={address}
              isDark={isDark}
            />
          )}

          <StepActions
            currentStep={currentStep}
            disabled={actionDisabled}
            loading={loading}
            onBack={handleBack}
            onNext={handleNext}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
