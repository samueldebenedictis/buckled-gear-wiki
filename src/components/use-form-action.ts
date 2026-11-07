"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import type { FormState } from "@/lib/form-state";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

/**
 * Come useActionState, ma senza il reset automatico del form di React 19:
 * se la validazione fallisce, quello che si è scritto resta nei campi.
 */
export function useFormAction(action: Action, confirmMessage?: string) {
  const [state, dispatch, pending] = useActionState(action, {} as FormState);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    const formData = new FormData(e.currentTarget);
    startTransition(() => dispatch(formData));
  };
  return { state, onSubmit, pending };
}
