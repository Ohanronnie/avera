import { useState } from "react";

export const useFormField = (initial = "") => {
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

export type FormField = ReturnType<typeof useFormField>;
