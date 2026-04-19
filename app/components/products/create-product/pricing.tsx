import { Text } from "@/components/themed/theme";
import { CurrencySelector } from "./currency-selector";
import { FormInput } from "./form-input";
import { CreateProduct } from "./schema";

interface PricingProps {
  form: CreateProduct;
  onUpdateForm: (updates: Partial<CreateProduct>) => void;
  errors: Record<string, string>;
  onOpenCurrencyModal: () => void;
}
export function Pricing({
  form,
  onUpdateForm,
  errors,
  onOpenCurrencyModal,
}: PricingProps) {
  return (
    <>
      <Text className="text-xl font-semibold mb-2 text-white">Pricing</Text>
      <FormInput
        label="Price"
        value={form.price ? String(form.price) : ""}
        onChange={(text) => onUpdateForm({ price: parseFloat(text) || 0 })}
        placeholder="Enter price"
        keyboardType="numeric"
        error={errors.price}
      />
      <CurrencySelector
        value={form.currency}
        onSelect={(currency) => onUpdateForm({ currency: currency as any })}
        error={errors.currency}
        onOpenModal={onOpenCurrencyModal}
      />
      <FormInput
        label="Quantity"
        value={String(form.quantity)}
        onChange={(text) => onUpdateForm({ quantity: parseInt(text) || 1 })}
        placeholder="Enter quantity"
        keyboardType="numeric"
        error={errors.quantity}
      />
    </>
  );
}
