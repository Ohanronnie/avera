import { productSchema } from "@/components/products/create-product/schema";
import {
  createContext,
  PropsWithChildren,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  CreateProductField,
  CreateProductForm,
  DEFAULT_CREATE_PRODUCT_FORM,
} from "@/features/product-create/types";

type FieldErrors = Record<string, string>;

interface CreateProductFlowContextValue {
  form: CreateProductForm;
  errors: FieldErrors;
  updateForm: (updates: Partial<CreateProductForm>) => void;
  setField: <K extends CreateProductField>(
    key: K,
    value: CreateProductForm[K],
  ) => void;
  clearErrors: () => void;
  validateFields: (fields: CreateProductField[]) => boolean;
  validateAll: () => boolean;
  reset: () => void;
}

const CreateProductFlowContext = createContext<
  CreateProductFlowContextValue | undefined
>(undefined);

export function CreateProductFlowProvider({ children }: PropsWithChildren) {
  const [form, setForm] = useState<CreateProductForm>(
    DEFAULT_CREATE_PRODUCT_FORM,
  );
  const [errors, setErrors] = useState<FieldErrors>({});

  const updateForm = (updates: Partial<CreateProductForm>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  };

  const setField = <K extends CreateProductField>(
    key: K,
    value: CreateProductForm[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const clearErrors = () => setErrors({});

  const validateFields = (fields: CreateProductField[]) => {
    const partialSchema = productSchema.pick(
      fields.reduce(
        (acc, field) => ({ ...acc, [field]: true }),
        {} as Record<CreateProductField, true>,
      ),
    );

    const result = partialSchema.safeParse(form);

    if (result.success) {
      const nextErrors = { ...errors };
      fields.forEach((field) => delete nextErrors[field]);
      setErrors(nextErrors);
      return true;
    }

    const fieldErrors: FieldErrors = {};
    result.error.issues.forEach((issue) => {
      const field = issue.path[0];
      if (typeof field === "string") {
        fieldErrors[field] = issue.message;
      }
    });

    setErrors((prev) => ({ ...prev, ...fieldErrors }));
    return false;
  };

  const validateAll = () => {
    const result = productSchema.safeParse(form);

    if (result.success) {
      setErrors({});
      return true;
    }

    const nextErrors: FieldErrors = {};
    result.error.issues.forEach((issue) => {
      const field = issue.path[0];
      if (typeof field === "string") {
        nextErrors[field] = issue.message;
      }
    });

    setErrors(nextErrors);
    return false;
  };

  const reset = () => {
    setForm(DEFAULT_CREATE_PRODUCT_FORM);
    setErrors({});
  };

  const value = useMemo(
    () => ({
      form,
      errors,
      updateForm,
      setField,
      clearErrors,
      validateFields,
      validateAll,
      reset,
    }),
    [form, errors],
  );

  return (
    <CreateProductFlowContext.Provider value={value}>
      {children}
    </CreateProductFlowContext.Provider>
  );
}

export function useCreateProductFlow() {
  const context = useContext(CreateProductFlowContext);

  if (!context) {
    throw new Error(
      "useCreateProductFlow must be used within CreateProductFlowProvider",
    );
  }

  return context;
}
