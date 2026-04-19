import { Text } from "@/components/themed/theme";
import { CustomSelect } from "@/components/custom-select";
import { FormInput } from "./form-input";
import { CreateProduct } from "./schema";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
interface BasicInfoProps {
  form: CreateProduct;
  onUpdateForm: (updates: Partial<CreateProduct>) => void;
  errors: Record<string, string>;
}
const NIGERIAN_STATES = [
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
  "Abuja",
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
];
export function BasicInfo({ form, onUpdateForm, errors }: BasicInfoProps) {
  const stateOptions = NIGERIAN_STATES.map((state) => ({
    label: state,
    value: state,
  }));

  return (
    <SafeAreaView className="flex-1 mt-10">
      <View>
        <Text className="text-xl font-semibold mb-2 text-white">
          Basic Info
        </Text>

        <FormInput
          label="Name"
          value={form.name}
          onChange={(text) => onUpdateForm({ name: text })}
          placeholder="Enter product name"
          error={errors.name}
        />

        <FormInput
          label="Description"
          value={form.description}
          onChange={(text) => onUpdateForm({ description: text })}
          placeholder="Enter description"
          multiline
          numberOfLines={6}
          error={errors.description}
        />
        <View style={{ maxHeight: 1000 }}>
          <Text className="mt-4 mb-1 font-medium text-white">Location </Text>
          <CustomSelect
            options={stateOptions}
            selectedValue={form.location}
            onValueChange={(location) => onUpdateForm({ location })}
            placeholder="Select your location"
            className="mb-1 "
            triggerClassName=""
            searchPlaceholder="Search state"
            dropdownMaxHeight={122}
          />
          {errors.location && (
            <Text className="text-red-500 text-sm ">{errors.location}</Text>
          )}
        </View>
        {/* State Selector */}
      </View>
    </SafeAreaView>
  );
}
