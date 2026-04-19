export type PasswordResetStepProps = {
  email: string;
};

export type PasswordResetMailStepProps = PasswordResetStepProps & {
  setEmail: (email: string) => void;
  next: () => void;
};

export type PasswordResetOtpStepProps = PasswordResetStepProps & {
  otp: string;
  setOtp: (otp: string) => void;
  next: () => void;
};

export type PasswordResetNewPasswordStepProps = PasswordResetStepProps & {
  otp: string;
};
