import Image from "next/image";

export default function MobileProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[340px] select-none" aria-label="Static mobile dashboard preview">
      <div className="relative rounded-[3rem] bg-[#263746] p-3.5 shadow-2xl shadow-[#34495E]/25 ring-1 ring-[#49647C]">
        <div className="absolute left-1/2 top-6 z-30 flex h-4 w-28 -translate-x-1/2 items-center justify-center rounded-full bg-slate-950" aria-hidden="true">
          <div className="mr-2 h-2 w-2 rounded-full bg-slate-800" />
          <div className="h-1.5 w-1.5 rounded-full bg-[#789BB8]/80" />
        </div>

        <div className="relative overflow-hidden rounded-[2.4rem] border border-slate-200/40 bg-slate-50 text-slate-900">
          <div className="flex items-center justify-between px-6 pb-1 pt-3 text-[11px] font-semibold text-slate-800">
            <span>9:41</span>
            <span className="rounded-full bg-[#EAF2F8] px-2 py-0.5 text-[9px] font-semibold text-[#34495E]">Preview</span>
          </div>

          <Image
            src="/mobile-dashboard-preview.png"
            alt="Mobile ChillDose dashboard showing dose summary, upcoming medicines, and weekly adherence"
            width={720}
            height={1275}
            sizes="(max-width: 768px) 88vw, 312px"
            className="block h-auto w-full"
          />

          <div aria-hidden="true" className="flex h-9 shrink-0 items-center justify-around border-t border-slate-200 bg-white px-1 text-[7px] font-semibold text-slate-400">
            <span className="text-[#34495E]">Today</span>
            <span>Medicines</span>
            <span>Inventory</span>
            <span>History</span>
          </div>
        </div>
      </div>
    </div>
  );
}
