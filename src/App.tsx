import { useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { DropZone } from "@/components/input/DropZone";
import { Workspace } from "@/components/Workspace";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { useGeoStore } from "@/stores/geo-store";

export default function App() {
  const { parseStatus, initGdal } = useGeoStore();

  useEffect(() => {
    initGdal();
  }, [initGdal]);

  return (
    <MainLayout>
      <ErrorBoundary fallbackLabel="Application error">
        {parseStatus === "idle" || parseStatus === "error" ? (
          <DropZone />
        ) : parseStatus === "loading" ? (
          <div className="bg-app-gradient flex flex-1 flex-col items-center justify-center gap-4 p-8">
            <LoadingSpinner size="lg" label="Processing geospatial data..." />
          </div>
        ) : (
          <Workspace />
        )}
      </ErrorBoundary>
    </MainLayout>
  );
}
