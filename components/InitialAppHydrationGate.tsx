"use client";

import { type ReactNode, useSyncExternalStore } from "react";
import BrandedLoadingScreen from "@/components/BrandedLoadingScreen";

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export default function InitialAppHydrationGate({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  if (!mounted) return <BrandedLoadingScreen />;
  return children;
}
