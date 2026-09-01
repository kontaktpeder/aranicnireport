import logo from "@/assets/gos-logo.png";
import { cn } from "@/lib/utils";
import { useI18n, type Lang } from "@/lib/i18n";

export function Wordmark({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dims = size === "lg" ? 72 : size === "md" ? 44 : 30;
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <img
        src={logo}
        alt="Gold of Sicily"
        width={dims}
        height={dims}
        style={{ width: dims, height: dims }}
      />
      <span
        className={cn(
          "font-[family-name:var(--font-display)] leading-none tracking-tight",
          size === "lg" ? "text-3xl" : size === "md" ? "text-xl" : "text-base",
        )}
      >
        Gold of Sicily
      </span>
    </div>
  );
}

export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang } = useI18n();
  const options: Lang[] = ["no", "en"];
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-card p-1",
        className,
      )}
    >
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setLang(option)}
          aria-pressed={lang === option}
          className={cn(
            "min-w-11 rounded-full px-3 py-1.5 text-xs font-semibold tracking-[0.14em] uppercase transition-colors",
            lang === option
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
