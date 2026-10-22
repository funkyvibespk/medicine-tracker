import Image from "next/image";

export default function BrandedLoadingScreen() {
  return (
    <main className="chilldose-loading-screen" role="status" aria-live="polite" aria-busy="true">
      <div className="chilldose-loading-content">
        <div className="chilldose-loading-mark-wrap" aria-hidden="true">
          <span className="chilldose-loading-ring" />
          <span className="chilldose-loading-mark">
            <Image
              src="/chilldose-logo-mark.png"
              alt=""
              width={2000}
              height={2000}
              priority
              className="chilldose-loading-image"
            />
          </span>
        </div>
        <p className="chilldose-loading-name">ChillDose</p>
        <p className="chilldose-loading-tagline">Take your dose with chill.</p>
        <span className="sr-only">Loading your local tracker</span>
      </div>
    </main>
  );
}
