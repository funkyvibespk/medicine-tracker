import Image from "next/image";

export default function DashboardPreview() {
  return (
    <section id="product-demo" aria-label="ChillDose dashboard preview" className="landing-preview-stage relative z-20 -mt-16 scroll-mt-24 px-3 pb-14 sm:-mt-24 sm:px-6 sm:pb-20 lg:-mt-28 lg:px-8 lg:pb-24">
      <div className="relative mx-auto w-full max-w-6xl">
        <Image
          src="/dashboard-hero-preview.png"
          alt="ChillDose dashboard preview"
          width={1476}
          height={910}
          priority
          sizes="(max-width: 640px) calc(100vw - 24px), (max-width: 1280px) calc(100vw - 64px), 1152px"
          className="landing-preview-frame mx-auto block h-auto w-full rounded-2xl border sm:rounded-3xl"
        />
      </div>
      <p className="mx-auto mt-4 max-w-3xl px-4 text-center text-xs text-slate-500">
        This preview is static and does not read or change your medicines, dose history, or inventory.
      </p>
    </section>
  );
}
