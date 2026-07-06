"use client";

import { useState } from "react";
import type { Garment, Selection } from "@/lib/types";
import { StepIndicator, type StepKey } from "@/components/StepIndicator";
import { UploadStep } from "@/components/UploadStep";
import { CatalogStep } from "@/components/CatalogStep";
import { ResultStep } from "@/components/ResultStep";

type WizardState = {
  step: StepKey;
  personImage: string | null;
  consent: boolean;
  selection: Selection | null;
};

const initialState: WizardState = {
  step: "upload",
  personImage: null,
  consent: false,
  selection: null,
};

export function Wizard({
  garments,
  compact = false,
  allowCustom = true,
}: {
  garments: Garment[];
  compact?: boolean;
  allowCustom?: boolean;
}) {
  const [state, setState] = useState<WizardState>(initialState);

  return (
    <div
      className={`flex flex-1 flex-col items-center bg-zinc-50 dark:bg-black ${
        compact ? "gap-6 px-4 py-6" : "gap-10 px-6 py-12"
      }`}
    >
      <StepIndicator current={state.step} />

      <main className="flex w-full flex-1 flex-col items-center justify-center">
        {state.step === "upload" && (
          <UploadStep
            onContinue={(photo, consent) =>
              setState({
                step: "catalog",
                personImage: photo,
                consent,
                selection: null,
              })
            }
          />
        )}

        {state.step === "catalog" && state.personImage && (
          <CatalogStep
            garments={garments}
            allowCustom={allowCustom}
            onSelect={(selection) =>
              setState((s) => ({ ...s, step: "result", selection }))
            }
            onBack={() => setState(initialState)}
          />
        )}

        {state.step === "result" && state.personImage && state.selection && (
          <ResultStep
            personImage={state.personImage}
            selection={state.selection}
            consent={state.consent}
            onTryAnother={() => setState((s) => ({ ...s, step: "catalog" }))}
            onStartOver={() => setState(initialState)}
          />
        )}
      </main>
    </div>
  );
}
