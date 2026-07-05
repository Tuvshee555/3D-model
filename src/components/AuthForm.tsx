"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import type { AuthState } from "@/app/actions/auth";

type Props = {
  mode: "login" | "signup";
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>;
  googleEnabled?: boolean;
};

function SubmitButton({ mode }: { mode: "login" | "signup" }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-[var(--color-primary)] px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {pending
        ? "Please wait…"
        : mode === "login"
          ? "Log in"
          : "Create account"}
    </button>
  );
}

export function AuthForm({ mode, action, googleEnabled }: Props) {
  const [state, formAction] = useActionState<AuthState, FormData>(action, null);

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-16 dark:bg-black">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-2xl font-semibold tracking-tight">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {mode === "login"
            ? "Log in to manage your stores and try-ons."
            : "Set up a store and start offering virtual try-on."}
        </p>

        {googleEnabled && (
          <>
            <a
              href="/api/auth/google/start"
              className="mt-6 flex items-center justify-center gap-2 rounded-full border border-zinc-300 px-6 py-2.5 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              <span className="text-base">G</span> Continue with Google
            </a>
            <div className="my-4 flex items-center gap-3 text-xs text-zinc-400">
              <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
              or
              <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
            </div>
          </>
        )}

        <form action={formAction} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Email</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-[var(--color-primary)] dark:border-zinc-700"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Password</span>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-[var(--color-primary)] dark:border-zinc-700"
            />
          </label>

          {mode === "signup" && (
            <label className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400">
              <input
                name="consent"
                type="checkbox"
                required
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-primary)]"
              />
              <span>
                I&apos;m 13 or older and agree to the{" "}
                <Link
                  href="/terms"
                  className="text-[var(--color-primary)] underline-offset-2 hover:underline"
                >
                  Terms
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  className="text-[var(--color-primary)] underline-offset-2 hover:underline"
                >
                  Privacy Policy
                </Link>
                , including AI processing of photos I upload.
              </span>
            </label>
          )}

          {state?.error && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}

          <SubmitButton mode={mode} />
        </form>

        <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          {mode === "login" ? (
            <>
              No account?{" "}
              <Link
                href="/signup"
                className="text-[var(--color-primary)] underline-offset-2 hover:underline"
              >
                Sign up
              </Link>
            </>
          ) : (
            <>
              Already have one?{" "}
              <Link
                href="/login"
                className="text-[var(--color-primary)] underline-offset-2 hover:underline"
              >
                Log in
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
