import { useDeferredValue, useMemo, useState } from "react";
import type { AssetDef, AssetType } from "../../../../shared/src/index";
import { isVisualAsset } from "../../lib/assets";

const ASSET_TYPES: Array<AssetType | "all"> = ["all", "texture", "sprite", "portrait", "icon", "audio", "mesh"];

interface AssetBrowserProps {
  assets: AssetDef[];
  usageByAssetId?: Map<string, Array<{ label: string; meta?: string }>>;
}

export function AssetBrowser({ assets, usageByAssetId }: AssetBrowserProps): JSX.Element {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<AssetType | "all">("all");
  const deferredQuery = useDeferredValue(query);

  const filteredAssets = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    return [...assets]
      .sort((left, right) => left.id.localeCompare(right.id))
      .filter((asset) => {
        if (typeFilter !== "all" && asset.type !== typeFilter) {
          return false;
        }
        if (!normalizedQuery) {
          return true;
        }
        return asset.id.toLowerCase().includes(normalizedQuery) || asset.path.toLowerCase().includes(normalizedQuery);
      });
  }, [assets, deferredQuery, typeFilter]);

  return (
    <>
      <div className="admin-assets-toolbar">
        <input
          className="admin-assets-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter by asset ID or path"
          aria-label="Filter assets"
        />
        <select
          className="admin-zone-picker"
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value as AssetType | "all")}
          aria-label="Filter assets by type"
        >
          {ASSET_TYPES.map((type) => (
            <option key={type} value={type}>
              {type === "all" ? "All types" : type}
            </option>
          ))}
        </select>
      </div>

      {filteredAssets.length === 0 ? (
        <p className="admin-empty">No assets match the current filter.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Preview</th>
                <th>Asset ID</th>
                <th>Type</th>
                <th>Path</th>
                <th>Used By</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.map((asset) => (
                <tr key={asset.id}>
                  <td>
                    {isVisualAsset(asset) ? (
                      <img className="admin-asset-thumb pixel-art-asset" src={asset.path} alt={asset.id} />
                    ) : (
                      <span className="admin-asset-type-label">{asset.type}</span>
                    )}
                  </td>
                  <td className="run-slot">{asset.id}</td>
                  <td>
                    <span className={`admin-asset-badge admin-asset-badge--${asset.type}`}>{asset.type}</span>
                  </td>
                  <td className="admin-asset-path">{asset.path}</td>
                  <td>
                    <div className="admin-asset-usage-list">
                      {(usageByAssetId?.get(asset.id) ?? []).slice(0, 4).map((entry) => (
                        <div key={`${entry.label}-${entry.meta ?? ""}`} className="admin-asset-usage-item">
                          <span>{entry.label}</span>
                          {entry.meta && <span>{entry.meta}</span>}
                        </div>
                      ))}
                      {((usageByAssetId?.get(asset.id)?.length ?? 0) === 0) && <span className="admin-asset-type-label">unused</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
