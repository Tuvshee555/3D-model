import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { loginAction } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth";
import { googleEnabled } from "@/lib/google";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  return (
    <AuthForm mode="login" action={loginAction} googleEnabled={googleEnabled()} />
  );
}
