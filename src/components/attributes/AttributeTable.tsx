import { useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useGeoStore } from "@/stores/geo-store";
import { useUiStore } from "@/stores/ui-store";
import { formatNumber } from "@/utils/format";
import { X, Table2 } from "lucide-react";

export function AttributeTable() {
  const features = useGeoStore((s) => s.features);
  const { selectedFeatureId, setSelectedFeatureId, setBottomPanel } = useUiStore();
  const parentRef = useRef<HTMLDivElement>(null);

  const { columns, rows } = useMemo(() => {
    if (!features?.features.length) return { columns: [] as string[], rows: [] as Record<string, unknown>[] };

    const colSet = new Set<string>();
    for (const f of features.features) {
      if (f.properties) {
        for (const key of Object.keys(f.properties)) {
          colSet.add(key);
        }
      }
    }
    const columns = Array.from(colSet);

    const rows = features.features.map((f, i) => ({
      __id: f.id ?? i,
      __geometryType: f.geometry?.type ?? "Unknown",
      ...f.properties,
    }));

    return { columns, rows };
  }, [features]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 28,
    overscan: 10,
  });

  if (!features?.features.length) return null;

  return (
    <div className="flex h-full flex-col bg-surface-1">
      {/* Header bar */}
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-border px-3">
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <Table2 className="h-3.5 w-3.5" />
          <span>{formatNumber(rows.length)} features</span>
          <span className="text-text-muted">|</span>
          <span>{columns.length} columns</span>
        </div>
        <button
          onClick={() => setBottomPanel(null)}
          className="text-text-muted transition-colors hover:text-text-primary"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Table */}
      <div ref={parentRef} className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10 bg-surface-2">
            <tr>
              <th className="whitespace-nowrap border-b border-border px-3 py-1.5 text-left font-medium text-text-secondary">
                #
              </th>
              <th className="whitespace-nowrap border-b border-border px-3 py-1.5 text-left font-medium text-text-secondary">
                Geometry
              </th>
              {columns.map((col) => (
                <th
                  key={col}
                  className="whitespace-nowrap border-b border-border px-3 py-1.5 text-left font-medium text-text-secondary"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index]!;
              const isSelected = row.__id === selectedFeatureId;

              return (
                <tr
                  key={virtualRow.index}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  onClick={() => setSelectedFeatureId(row.__id as string | number)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-accent/10 text-text-primary"
                      : "text-text-secondary hover:bg-surface-2"
                  }`}
                >
                  <td className="whitespace-nowrap border-b border-border/50 px-3 py-1 text-text-muted">
                    {virtualRow.index + 1}
                  </td>
                  <td className="whitespace-nowrap border-b border-border/50 px-3 py-1">
                    {String(row.__geometryType)}
                  </td>
                  {columns.map((col) => (
                    <td
                      key={col}
                      className="max-w-[200px] truncate whitespace-nowrap border-b border-border/50 px-3 py-1"
                    >
                      {row[col] != null ? String(row[col]) : ""}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
