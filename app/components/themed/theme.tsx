import { Text as GSText } from "@/components/ui/text";
import cn from "clsx";
import { ComponentProps } from "react";
import { Input } from "../ui/input";
type ThemedTextProps = ComponentProps<typeof GSText> & {
  variant?: "default" | "muted" | "heading" | "none";
};

const variants = {
  none: "",
  default: "text-black dark:text-gray-100",
  muted: "text-gray-500 dark:text-gray-400",
  heading: "font-bold text-gray-950 dark:text-white",
};

export function Text({
  className,
  variant = "default",
  ...props
}: ThemedTextProps) {
  return <GSText className={cn(variants[variant], className)} {...props} />;
}

export function ThemeInput({
  className,
  children,
  ...props
}: ComponentProps<typeof Input>) {
  return (
    <Input className={cn("", className)} {...props}>
      {children}
    </Input>
  );
}
