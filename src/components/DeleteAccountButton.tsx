"use client";

import { deleteAccountAction } from "@/app/actions/auth";

export function DeleteAccountButton() {
  return (
    <form
      action={deleteAccountAction}
      onSubmit={(e) => {
        if (
          !confirm(
            "Delete your account and all your data? This can't be undone."
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="rounded-full border border-red-300 px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/40"
      >
        Delete my account
      </button>
    </form>
  );
}
