const STEPS = [
  { key: "upload", label: "Your photo" },
  { key: "catalog", label: "Pick a look" },
  { key: "result", label: "Preview" },
] as const;

export type StepKey = (typeof STEPS)[number]["key"];

export function StepIndicator({ current }: { current: StepKey }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);

  return (
    <ol className="flex items-center justify-center gap-3 text-sm">
      {STEPS.map((step, index) => {
        const isDone = index < currentIndex;
        const isCurrent = index === currentIndex;
        return (
          <li key={step.key} className="flex items-center gap-3">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                isCurrent
                  ? "bg-[var(--color-primary)] text-white"
                  : isDone
                    ? "bg-[var(--color-primary)]/20 text-[var(--color-primary)]"
                    : "bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            >
              {index + 1}
            </span>
            <span
              className={
                isCurrent
                  ? "font-medium text-zinc-900 dark:text-zinc-50"
                  : "text-zinc-500 dark:text-zinc-400"
              }
            >
              {step.label}
            </span>
            {index < STEPS.length - 1 && (
              <span className="mx-1 h-px w-8 bg-zinc-300 dark:bg-zinc-700" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
