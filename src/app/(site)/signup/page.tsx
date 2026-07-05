import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { signupAction } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth";
import { googleEnabled } from "@/lib/google";

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  return (
    <AuthForm
      mode="signup"
      action={signupAction}
      googleEnabled={googleEnabled()}
    />
  );
}
