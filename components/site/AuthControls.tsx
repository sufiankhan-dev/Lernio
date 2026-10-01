"use client";

import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

export function AuthControls() {
  return (
    <>
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button
            type="button"
            className="text-body-large font-medium text-neutral-900 transition-colors hover:text-primary-500"
          >
            Sign in
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary-500 px-4 text-body font-medium text-white shadow-sm transition-colors hover:bg-primary-600"
          >
            Sign up
          </button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <UserButton />
      </Show>
    </>
  );
}
