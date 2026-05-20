import { Fragment, useEffect, useState } from "react";
import {
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import { AveraLoader } from "@/components/brand/AveraLoader";
import { CustomSelect } from "@/components/custom-select";
import { Text } from "@/components/themed/theme";
import { NIGERIA_STATE_OPTIONS } from "@/components/auth/user-info/constants";
import { useMeQuery, useUpdateProfileMutation } from "@/features/profile/hooks";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { usePreferencesStore } from "@/stores/preferences-store";
import { axiosInstance, BASE_URL } from "@/utils/axios";

type ProfileForm = {
  firstName: string;
  lastName: string;
  username: string;
  phoneNumber: string;
  avatarUrl: string;
  coverPhotoUrl: string;
  bio: string;
  state: string;
  city: string;
  address: string;
  country: string;
};

const initialForm: ProfileForm = {
  firstName: "",
  lastName: "",
  username: "",
  phoneNumber: "",
  avatarUrl: "",
  coverPhotoUrl: "",
  bio: "",
  state: "",
  city: "",
  address: "",
  country: "Nigeria",
};

export default function EditProfileScreen() {
  const { isDark } = useTheme();
  const { login } = useAuth();
  const toast = useToast();
  const profileEditDraft = usePreferencesStore((state) => state.profileEditDraft);
  const setProfileEditDraft = usePreferencesStore(
    (state) => state.setProfileEditDraft,
  );
  const clearProfileEditDraft = usePreferencesStore(
    (state) => state.clearProfileEditDraft,
  );
  const [form, setForm] = useState<ProfileForm>(initialForm);
  const [uploadingImage, setUploadingImage] = useState<
    "avatarUrl" | "coverPhotoUrl" | null
  >(null);
  const {
    data: profile,
    isLoading: loading,
    isError: profileLoadFailed,
  } = useMeQuery();
  const updateProfileMutation = useUpdateProfileMutation();

  const setField = (field: keyof ProfileForm, value: string) => {
    setForm((current) => {
      const next = { ...current, [field]: value };
      setProfileEditDraft(next);
      return next;
    });
  };
  const stateOptions = NIGERIA_STATE_OPTIONS.map((stateName) => ({
    label: stateName,
    value: stateName,
  }));

  useEffect(() => {
    if (Object.keys(profileEditDraft).length > 0) {
      setForm((current) => ({
        ...current,
        ...profileEditDraft,
      }));
      return;
    }

    if (!profile) return;

    const nextForm = {
      firstName: profile.firstName || "",
      lastName: profile.lastName || "",
      username: profile.username || "",
      phoneNumber: profile.phoneNumber || "",
      avatarUrl: profile.avatarUrl || "",
      coverPhotoUrl: profile.coverPhotoUrl || "",
      bio: profile.bio || "",
      state: profile.location?.state || "",
      city: profile.location?.city || "",
      address: profile.location?.address || "",
      country: profile.location?.country || "Nigeria",
    };
    setForm(nextForm);
    setProfileEditDraft(nextForm);
  }, [profile, profileEditDraft, setProfileEditDraft]);

  const handleSave = async () => {
    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      username: form.username.trim(),
      phoneNumber: form.phoneNumber.trim(),
      avatarUrl: form.avatarUrl.trim() || undefined,
      coverPhotoUrl: form.coverPhotoUrl.trim() || undefined,
      bio: form.bio.trim(),
      state: form.state.trim(),
      city: form.city.trim(),
      address: form.address.trim(),
      country: form.country.trim() || "Nigeria",
    };

    if (
      !payload.firstName ||
      !payload.lastName ||
      !payload.username ||
      !payload.phoneNumber ||
      !payload.state ||
      !payload.city ||
      !payload.address
    ) {
      toast.show({
        title: "Complete your profile",
        description:
          "Name, username, phone, state, city, and address are required.",
        variant: "error",
      });
      return;
    }

    try {
      const data = await updateProfileMutation.mutateAsync(payload);
      login(data);
      clearProfileEditDraft();
      toast.show({
        title: "Profile updated",
        description: "Your profile details have been saved.",
        variant: "success",
      });
      router.back();
    } catch (error: any) {
      const response = error?.response?.data;
      const fieldErrors = response?.fieldErrors;
      const firstFieldError = fieldErrors
        ? Object.values(fieldErrors).flat().find(Boolean)
        : null;

      toast.show({
        title: "Update failed",
        description:
          response?.message ||
          (typeof firstFieldError === "string" ? firstFieldError : null) ||
          "We could not update your profile right now.",
        variant: "error",
      });
    }
  };

  const uploadImage = async (uri: string) => {
    const formData = new FormData();
    formData.append("images", {
      uri,
      name: uri.split("/").pop() || "profile-image.jpg",
      type: "image/jpeg",
    } as unknown as Blob);

    const { data } = await axiosInstance.post<{
      files: Array<{ path: string }>;
    }>("/uploads/images", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    const path = data.files?.[0]?.path;
    if (!path) throw new Error("Image upload failed");
    return path.startsWith("http") ? path : `${BASE_URL}/media/${path}`;
  };

  const pickProfileImage = async (field: "avatarUrl" | "coverPhotoUrl") => {
    if (uploadingImage) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.show({
        title: "Photos unavailable",
        description: "Allow photo access to update your profile images.",
        variant: "error",
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: field === "coverPhotoUrl" ? [16, 9] : [1, 1],
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return;

    try {
      setUploadingImage(field);
      const imageUrl = await uploadImage(result.assets[0].uri);
      setField(field, imageUrl);
    } catch (error: any) {
      toast.show({
        title: "Upload failed",
        description:
          error?.response?.data?.message ||
          "We could not upload this image right now.",
        variant: "error",
      });
    } finally {
      setUploadingImage(null);
    }
  };

  const fields: Array<{
    label: string;
    key: keyof ProfileForm;
    placeholder: string;
    multiline?: boolean;
    keyboardType?: "default" | "phone-pad";
  }> = [
    { label: "First Name", key: "firstName", placeholder: "Ronnie" },
    { label: "Last Name", key: "lastName", placeholder: "Ohan" },
    { label: "Username", key: "username", placeholder: "ronnie_ohan" },
    {
      label: "Phone Number",
      key: "phoneNumber",
      placeholder: "+2348123456789",
      keyboardType: "phone-pad",
    },
    {
      label: "Bio",
      key: "bio",
      placeholder: "Tell buyers and sellers about yourself",
      multiline: true,
    },
    { label: "City", key: "city", placeholder: "Ikeja" },
    {
      label: "House Address",
      key: "address",
      placeholder: "12 Market Street",
      multiline: true,
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#0A0A0A]" edges={["top"]}>
      <View className="flex-row items-center justify-between border-b border-gray-100 bg-white px-5 py-4 dark:border-white/5 dark:bg-[#0A0A0A]">
        <Pressable
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center rounded-full border border-gray-100 bg-gray-50 dark:border-white/10 dark:bg-white/5"
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color={isDark ? "#FFFFFF" : "#111827"}
          />
        </Pressable>
        <Text className="text-lg font-bold text-gray-950 dark:text-white">
          Edit Profile
        </Text>
        <View className="h-11 w-11" />
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.select({ ios: "padding", android: undefined })}
      >
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <AveraLoader label="Loading profile" />
          </View>
        ) : profileLoadFailed ? (
          <View className="flex-1 items-center justify-center px-10">
            <Text className="text-center text-lg font-bold text-gray-900 dark:text-white">
              Profile unavailable
            </Text>
            <Text className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
              We could not load your profile right now.
            </Text>
          </View>
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerClassName="px-5 pb-10 pt-5"
            showsVerticalScrollIndicator={false}
          >
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              Keep your public profile and delivery location up to date.
            </Text>

            <View className="mt-5">
              <Pressable
                onPress={() => pickProfileImage("coverPhotoUrl")}
                className="h-44 overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 dark:border-white/10 dark:bg-white/5"
              >
                {form.coverPhotoUrl ? (
                  <ImageBackground
                    source={{ uri: form.coverPhotoUrl }}
                    className="h-full w-full justify-end"
                    resizeMode="cover"
                  >
                    <View className="bg-black/35 p-4">
                      <Text
                        variant="none"
                        className="text-sm font-bold text-white"
                      >
                        Change cover photo
                      </Text>
                    </View>
                  </ImageBackground>
                ) : (
                  <View className="h-full items-center justify-center">
                    {uploadingImage === "coverPhotoUrl" ? (
                      <AveraLoader size={28} compact />
                    ) : (
                      <>
                        <Ionicons
                          name="image-outline"
                          size={30}
                          color={isDark ? "#9CA3AF" : "#6B7280"}
                        />
                        <Text className="mt-2 text-sm font-bold text-gray-700 dark:text-gray-300">
                          Add Cover Photo
                        </Text>
                      </>
                    )}
                  </View>
                )}
              </Pressable>

              <View className="-mt-10 ml-5 flex-row items-end">
                <Pressable
                  onPress={() => pickProfileImage("avatarUrl")}
                  className="h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gray-100 dark:border-[#0A0A0A] dark:bg-white/10"
                >
                  {uploadingImage === "avatarUrl" ? (
                    <AveraLoader size={28} compact />
                  ) : form.avatarUrl ? (
                    <Image
                      source={{ uri: form.avatarUrl }}
                      className="h-full w-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <Ionicons
                      name="person-outline"
                      size={30}
                      color={isDark ? "#9CA3AF" : "#6B7280"}
                    />
                  )}
                </Pressable>
                <Pressable
                  onPress={() => pickProfileImage("avatarUrl")}
                  className="mb-2 ml-3 flex-row items-center rounded-full bg-brand px-4 py-2"
                >
                  <Ionicons name="camera-outline" size={16} color="#FFFFFF" />
                  <Text
                    variant="none"
                    className="ml-2 text-sm font-bold text-white"
                  >
                    Avatar
                  </Text>
                </Pressable>
              </View>
            </View>

            <View className="mt-5">
              {fields.map((field) => (
                <Fragment key={field.key}>
                  {field.key === "city" && (
                    <View className="z-20 mb-4">
                      <Text className="mb-2 text-sm font-bold text-gray-900 dark:text-white">
                        State
                      </Text>
                      <CustomSelect
                        options={stateOptions}
                        selectedValue={form.state}
                        onValueChange={(value) => setField("state", value)}
                        placeholder="Select state"
                        searchable
                        searchPlaceholder="Search state"
                        dropdownMaxHeight={260}
                        triggerClassName="rounded-2xl border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/5"
                      />
                    </View>
                  )}
                  <View className="mb-4">
                    <Text className="mb-2 text-sm font-bold text-gray-900 dark:text-white">
                      {field.label}
                    </Text>
                    <TextInput
                      value={form[field.key]}
                      onChangeText={(value) => setField(field.key, value)}
                      placeholder={field.placeholder}
                      placeholderTextColor="#9CA3AF"
                      multiline={field.multiline}
                      keyboardType={field.keyboardType || "default"}
                      autoCapitalize={
                        field.key === "username" ? "none" : "sentences"
                      }
                      className={`rounded-2xl border border-gray-200 bg-gray-50 px-4 text-base text-gray-950 dark:border-white/10 dark:bg-white/5 dark:text-white ${
                        field.multiline ? "h-28 pt-4" : "h-14"
                      }`}
                      style={{
                        textAlignVertical: field.multiline ? "top" : "center",
                      }}
                    />
                  </View>
                </Fragment>
              ))}
            </View>

            <Pressable
              onPress={handleSave}
              disabled={updateProfileMutation.isPending}
              className="mt-2 h-14 flex-row items-center justify-center rounded-full bg-brand"
            >
              {updateProfileMutation.isPending ? (
                <AveraLoader size={24} color="#FFFFFF" compact />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  <Text variant="none" className="ml-2 font-bold text-white">
                    Save Changes
                  </Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
