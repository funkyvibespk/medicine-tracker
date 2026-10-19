import Image from "next/image";

const previewImage = "/dashboard-hero-preview.png";

export default function DashboardPreview() {
  return (
    <section id="product-demo" aria-label="ChillDose dashboard preview" className="relative z-20 -mt-16 scroll-mt-24 px-3 pb-14 sm:-mt-24 sm:px-6 sm:pb-20 lg:-mt-28 lg:px-8 lg:pb-24">
      <div className="group/preview relative mx-auto w-full max-w-6xl">
        <Image
          src={previewImage}
          alt="ChillDose dashboard preview"
          width={1476}
          height={910}
          priority
          className="mx-auto block h-auto w-full rounded-2xl border border-slate-200/80 shadow-[0_24px_72px_-30px_rgba(15,23,42,0.24)] sm:rounded-3xl"
        />

        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-2 opacity-0 backdrop-blur-[2px] transition-opacity duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/preview:opacity-100 motion-reduce:transition-none sm:p-4 lg:p-6">
          <Image
            src={previewImage}
            alt=""
            width={1476}
            height={910}
            className="h-auto max-h-full w-auto max-w-full origin-center scale-[0.985] rounded-xl object-contain opacity-0 shadow-2xl transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/preview:scale-100 group-hover/preview:opacity-100 motion-reduce:transform-none motion-reduce:transition-none sm:rounded-2xl"
          />
        </div>
      </div>
      <p className="mx-auto mt-4 max-w-3xl px-4 text-center text-xs text-slate-500">
        This preview is static and does not read or change your medicines, dose history, or inventory.
      </p>
    </section>
  );
}
