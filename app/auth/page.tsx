import { Suspense } from "react";
import AuthExperience from "./AuthExperience";
import BrandedLoadingScreen from "@/components/BrandedLoadingScreen";

type AuthPageProps = {
  searchParams: Promise<{ mode?: string | string[] }>;
};

function AuthLoading() {
  return <BrandedLoadingScreen />;
}

async function AuthModeContent({ searchParams }: AuthPageProps) {
  const params = await searchParams;
  const requestedMode = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const initialMode = requestedMode === "signup" ? "signup" : "login";

  return <AuthExperience key={initialMode} initialMode={initialMode} />;
}

export default function AuthPage({ searchParams }: AuthPageProps) {
  return (
    <Suspense fallback={<AuthLoading />}>
      <AuthModeContent searchParams={searchParams} />
    </Suspense>
  );
}
