import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function QuestionCard({
  step,
  label,
  question,
  children,
}: {
  step: number;
  label: string;
  question: string;
  children: ReactNode;
}) {
  return (
    <section className="surface-card p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-full bg-primary text-[0.7rem] font-bold text-primary-foreground">
          {step}
        </span>
        <span className="eyebrow">{label}</span>
      </div>
      <h2 className="mt-3 text-xl leading-snug font-semibold sm:text-2xl">{question}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function BigChoice<T extends string | boolean>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; tone?: "neutral" | "positive" | "negative" }[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={String(option.value)}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={selected}
            className={cn(
              "min-h-16 rounded-2xl border-2 px-2 py-4 text-base font-semibold transition-all active:scale-[0.98]",
              selected
                ? "border-transparent bg-primary text-primary-foreground shadow-[var(--shadow-card)]"
                : "border-border bg-card text-foreground hover:border-primary/60",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function NumberStepper({
  value,
  onChange,
  step = 10,
  autoFocus,
}: {
  value: number | "";
  onChange: (value: number | "") => void;
  step?: number;
  autoFocus?: boolean;
}) {
  const numeric = value === "" ? 0 : value;
  const smallStep = 1;
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label={`minus ${step}`}
        onClick={() => onChange(Math.max(0, numeric - step))}
        className="flex h-14 flex-1 min-w-10 items-center justify-center rounded-2xl border-2 border-border bg-card text-base font-bold transition-colors hover:border-primary/60 active:scale-95"
      >
        -{step}
      </button>
      <button
        type="button"
        aria-label="minus one"
        onClick={() => onChange(Math.max(0, numeric - smallStep))}
        className="flex h-14 flex-1 min-w-10 items-center justify-center rounded-2xl border-2 border-border bg-card text-base font-bold transition-colors hover:border-primary/60 active:scale-95"
      >
        -1
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        autoFocus={autoFocus}
        value={value}
        onChange={(event) => {
          const raw = event.target.value;
          onChange(raw === "" ? "" : Math.max(0, Number.parseInt(raw, 10) || 0));
        }}
        className="h-16 min-w-0 flex-[1.5] rounded-2xl border-2 border-border bg-card text-center text-2xl font-bold tabular-nums outline-none focus:border-primary"
      />
      <button
        type="button"
        aria-label="plus one"
        onClick={() => onChange(numeric + smallStep)}
        className="flex h-14 flex-1 min-w-10 items-center justify-center rounded-2xl border-2 border-border bg-card text-base font-bold transition-colors hover:border-primary/60 active:scale-95"
      >
        +1
      </button>
      <button
        type="button"
        aria-label={`plus ${step}`}
        onClick={() => onChange(numeric + step)}
        className="flex h-14 flex-1 min-w-10 items-center justify-center rounded-2xl border-2 border-border bg-card text-base font-bold transition-colors hover:border-primary/60 active:scale-95"
      >
        +{step}
      </button>
    </div>
  );
}

export function TextField({
  value,
  onChange,
  placeholder,
  type = "text",
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  label?: string;
}) {
  return (
    <label className="block">
      {label ? <span className="eyebrow mb-2 block">{label}</span> : null}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-13 w-full rounded-2xl border-2 border-border bg-card px-4 text-base outline-none focus:border-primary"
      />
    </label>
  );
}

export function TextAreaField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      placeholder={placeholder}
      rows={3}
      onChange={(event) => onChange(event.target.value)}
      className="w-full resize-none rounded-2xl border-2 border-border bg-card px-4 py-3 text-base outline-none focus:border-primary"
    />
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = "button",
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "min-h-16 w-full rounded-2xl bg-primary text-base font-bold tracking-[0.08em] text-primary-foreground uppercase shadow-[var(--shadow-lift)] transition-all active:scale-[0.99] disabled:opacity-60",
        className,
      )}
    >
      {children}
    </button>
  );
}
