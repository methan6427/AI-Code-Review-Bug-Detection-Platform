export const validateAuthForm = (input: { mode: "login" | "signup"; email: string; password: string; fullName: string }) => {
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const fullName = input.fullName.trim();

  if (!email) {
    return "Email is required";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Enter a valid email address";
  }
  if (!password) {
    return "Password is required";
  }
  if (password.length < 8) {
    return "Password must be at least 8 characters";
  }
  if (input.mode === "signup" && fullName.length < 2) {
    return "Full name must be at least 2 characters";
  }

  return null;
};
