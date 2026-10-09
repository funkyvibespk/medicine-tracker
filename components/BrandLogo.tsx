type BrandLogoProps = {
  markClassName?: string;
  iconClassName?: string;
  wordmarkClassName?: string;
};

export function BrandLogo({
  markClassName = "h-9 w-9 rounded-xl",
  iconClassName = "h-5 w-5",
  wordmarkClassName = "text-lg font-bold tracking-tight sm:text-xl",
}: BrandLogoProps) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2.5">
      <span
        className={`flex shrink-0 items-center justify-center bg-gradient-to-tr from-teal-600 to-emerald-500 text-white shadow-sm shadow-teal-600/20 ${markClassName}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={iconClassName}
          aria-hidden="true"
        >
          <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
          <path d="m8.5 8.5 7 7" />
          <path d="M15.4 6.7c.9-.5 2-.2 2.5.7" strokeWidth="1.25" />
        </svg>
      </span>
      <span className={`whitespace-nowrap text-slate-900 dark:text-white ${wordmarkClassName}`}>
        Chill<span className="text-teal-600 dark:text-teal-400">Dose</span>
      </span>
    </span>
  );
}
