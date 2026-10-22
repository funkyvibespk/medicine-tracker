import { getMedicineFormAppearance } from "@/lib/medicineFormIcon";

interface MedicineFormIconProps {
  type: string | null | undefined;
  size?: "sm" | "md";
  className?: string;
}

export default function MedicineFormIcon({ type, size = "md", className = "" }: MedicineFormIconProps) {
  const appearance = getMedicineFormAppearance(type);
  const boxSize = size === "sm" ? "h-8 w-8 rounded-lg" : "h-10 w-10 rounded-xl";
  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center ${boxSize} ${appearance.backgroundClass} ${appearance.iconClass} ${className}`}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={iconSize}>
        {appearance.icon === "tablet" && <>
          <rect x="3.5" y="6" width="17" height="12" rx="6" />
          <path d="M12 6v12" />
        </>}
        {appearance.icon === "capsule" && <>
          <path d="M7.2 20.1a5.2 5.2 0 0 1-3.7-8.9l7.7-7.7a5.2 5.2 0 0 1 7.4 7.4l-7.7 7.7a5.2 5.2 0 0 1-3.7 1.5Z" />
          <path d="m7.2 9.7 7.1 7.1" />
        </>}
        {appearance.icon === "syrup" && <>
          <path d="M9 3h6v3H9z" />
          <path d="M8 6h8v2l2 2v9a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-9l2-2V6Z" />
          <path d="M6 12h12" />
        </>}
        {appearance.icon === "sachet" && <>
          <path d="M6 3.5h12l1 2-1 1.5v11l1 2-1 1.5H6l-1-1.5 1-2v-11L5 5.5l1-2Z" />
          <path d="M6 7h12M8 11h8" />
        </>}
        {appearance.icon === "injection" && <>
          <path d="m5 19 2-2m-4 4 2-2m7-15 6 6m-9 1 7-7m-9 9 7-7m-8 8 3 3 9-9-3-3-9 9Z" />
          <path d="m15 4 2-2m3 5 2-2M4 16l4 4m9-9 3 3" />
        </>}
        {appearance.icon === "unknown" && <>
          <rect x="4" y="4" width="16" height="16" rx="4" />
          <path d="M12 8v8m-4-4h8" />
        </>}
      </svg>
    </span>
  );
}
