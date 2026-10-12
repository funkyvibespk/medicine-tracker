import { Suspense } from "react";
import AuthExperience from "./AuthExperience";

type AuthPageProps = {
  searchParams: Promise<{ mode?: string | string[] }>;
};

function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6 text-sm font-medium text-slate-500 dark:bg-slate-950 dark:text-slate-400" aria-busy="true">
      Loading ChillDose…
    </div>
  );
}

async function AuthModeContent({ searchParams }: AuthPageProps) {
  const params = await searchParams;
  const requestedMode = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const initialMode = requestedMode === "login" ? "login" : "signup";

  return <AuthExperience initialMode={initialMode} />;
}

export default function AuthPage({ searchParams }: AuthPageProps) {
  return (
    <Suspense fallback={<AuthLoading />}>
      <AuthModeContent searchParams={searchParams} />
    </Suspense>
  );
}
