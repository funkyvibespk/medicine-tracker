import Image from "next/image";

type BrandLogoProps = {
  markClassName?: string;
  wordmarkClassName?: string;
};

export function BrandLogo({
  markClassName = "h-9 w-9",
  wordmarkClassName = "text-lg font-bold tracking-tight sm:text-xl",
}: BrandLogoProps) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2.5">
      <span
        className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-black shadow-sm shadow-slate-900/15 ${markClassName}`}
        aria-hidden="true"
      >
        <Image
          src="/chilldose-logo-mark.png"
          alt=""
          width={2000}
          height={2000}
          className="h-[88%] w-[88%] object-contain"
          priority
        />
      </span>
      <span className={`whitespace-nowrap text-slate-900 dark:text-white ${wordmarkClassName}`}>
        Chill<span className="text-teal-600 dark:text-teal-400">Dose</span>
      </span>
    </span>
  );
}
