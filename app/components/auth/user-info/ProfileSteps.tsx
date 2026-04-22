import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, View } from "react-native";

import { CustomSelect } from "@/components/custom-select";
import { Input, InputField } from "@/components/ui/input";
import { Text } from "@/components/ui/text";

import {
  DARK_FIELD_BORDER,
  DARK_FIELD_DIVIDER,
  LIGHT_FIELD_BORDER,
  LIGHT_FIELD_DIVIDER,
  NIGERIA_STATE_OPTIONS,
} from "./constants";
import { ProfileTextInput } from "./ProfileTextInput";
import type { FormField } from "./useFormField";

interface SharedStepProps {
  isDark: boolean;
}

interface NameStepProps extends SharedStepProps {
  firstName: FormField;
  lastName: FormField;
}

export function NameStep({ firstName, lastName, isDark }: NameStepProps) {
  return (
    <View>
      <ProfileTextInput
        label="First Name"
        field={firstName}
        placeholder="John"
        isDark={isDark}
      />
      <ProfileTextInput
        label="Last Name"
        field={lastName}
        placeholder="Doe"
        isDark={isDark}
      />
    </View>
  );
}

interface UsernameStepProps extends SharedStepProps {
  username: FormField;
  checkingUsername: boolean;
  usernameAvailable: boolean;
  onBlur: () => void;
}

export function UsernameStep({
  username,
  checkingUsername,
  usernameAvailable,
  isDark,
  onBlur,
}: UsernameStepProps) {
  const showSuccess = usernameAvailable && !username.error;
  const showError = !!username.error;

  return (
    <ProfileTextInput
      label="Username"
      field={username}
      placeholder="johndoe"
      isDark={isDark}
      autoCapitalize="none"
      spellCheck={false}
      onBlur={onBlur}
      inputRightElement={
        <View className="mr-3">
          {checkingUsername ? (
            <ActivityIndicator color="#2563EB" size="small" />
          ) : showSuccess || showError ? (
            <Ionicons
              name={showError ? "close-circle" : "checkmark-circle"}
              size={20}
              color={showError ? "#ef4444" : "#22c55e"}
            />
          ) : null}
        </View>
      }
    />
  );
}

interface BioStepProps extends SharedStepProps {
  bio: FormField;
}

export function BioStep({ bio, isDark }: BioStepProps) {
  return (
    <View className="mt-4">
      <Text className="mb-2 text-base font-medium text-gray-900 dark:text-white">
        Bio
      </Text>
      <Input
        className="h-28 rounded-xl border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-[#1A1A1A]"
        variant="outline"
        size="xl"
        style={{
          borderColor: bio.focus
            ? "#3b82f6"
            : bio.error
              ? "#ef4444"
              : isDark
                ? DARK_FIELD_BORDER
                : LIGHT_FIELD_BORDER,
        }}
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
          style={{ textAlignVertical: "top" }}
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
        <Text className="text-sm text-gray-400">{bio.value.length}/160</Text>
      </View>
    </View>
  );
}

interface PhoneStepProps extends SharedStepProps {
  countryCode: string;
  phone: FormField;
}

export function PhoneStep({ countryCode, phone, isDark }: PhoneStepProps) {
  return (
    <View className="mt-4">
      <Text className="mb-2 text-base font-medium text-gray-900 dark:text-white">
        Phone Number
      </Text>
      <Input
        className="h-14 rounded-xl bg-gray-50 p-0 dark:bg-[#1A1A1A]"
        variant="outline"
        size="xl"
        style={{
          borderColor: phone.focus
            ? "#3b82f6"
            : phone.error
              ? "#ef4444"
              : isDark
                ? DARK_FIELD_BORDER
                : LIGHT_FIELD_BORDER,
        }}
      >
        <View className="h-full w-full flex-row items-stretch">
          <View
            className="h-full items-center justify-center rounded-l-xl bg-gray-100 px-4 dark:bg-[#20242B]"
            style={{
              borderRightColor: isDark
                ? DARK_FIELD_DIVIDER
                : LIGHT_FIELD_DIVIDER,
              borderRightWidth: 1,
            }}
          >
            <Text className="text-black dark:text-white">{countryCode}</Text>
          </View>
          <InputField
            keyboardType="phone-pad"
            placeholder="8123456789"
            value={phone.value}
            onChangeText={phone.setValue}
            onFocus={() => phone.setFocus(true)}
            onBlur={() => phone.setFocus(false)}
            placeholderTextColor="#888"
            className="h-14 flex-1 px-4 text-black dark:text-white"
          />
        </View>
      </Input>
      {phone.error && <Text className="mt-1 text-red-500">{phone.error}</Text>}
    </View>
  );
}

interface AddressStepProps extends SharedStepProps {
  state: FormField;
  city: FormField;
  address: FormField;
}

export function AddressStep({
  state,
  city,
  address,
  isDark,
}: AddressStepProps) {
  const stateOptions = NIGERIA_STATE_OPTIONS.map((stateName) => ({
    label: stateName,
    value: stateName,
  }));

  return (
    <View>
      <View className="z-20 mt-4">
        <Text className="mb-2 text-base font-medium text-gray-900 dark:text-white">
          State
        </Text>
        <CustomSelect
          options={stateOptions}
          selectedValue={state.value}
          onValueChange={(nextState) => {
            state.setValue(nextState);
            state.setError(null);
          }}
          onToggle={state.setFocus}
          placeholder="Select state"
          searchable
          searchPlaceholder="Search state"
          dropdownMaxHeight={240}
          triggerClassName={state.error ? "border-red-500" : ""}
        />
        {state.error && (
          <Text className="mt-1 text-red-500">{state.error}</Text>
        )}
      </View>

      <ProfileTextInput
        label="City"
        field={city}
        placeholder="Ikeja"
        isDark={isDark}
      />
      <ProfileTextInput
        label="House Address"
        field={address}
        placeholder="12 Market Street"
        isDark={isDark}
        multiline
        numberOfLines={3}
      />
    </View>
  );
}
