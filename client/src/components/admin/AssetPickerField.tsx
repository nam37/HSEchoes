import { useMemo } from "react";
import type { AssetDef, AssetType } from "../../../../shared/src/index";
import { resolveAssetPath } from "../../lib/assets";
import { SearchablePickerField, type PickerOption } from "./AdminPicker";

interface AssetPickerFieldProps {
  label: string;
  value?: string;
  assets: AssetDef[];
  types: AssetType[];
  onChange: (value: string | undefined) => void;
}

export function AssetPickerField({ label, value, assets, types, onChange }: AssetPickerFieldProps): JSX.Element {
  const options = useMemo<PickerOption[]>(
    () => assets
      .filter((asset) => types.includes(asset.type))
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((asset) => ({
        value: asset.id,
        label: asset.id,
        subtitle: asset.path,
        previewSrc: asset.type === "audio" || asset.type === "mesh" ? undefined : asset.path,
        meta: asset.type,
      })),
    [assets, types]
  );

  const normalizedValue = useMemo(() => {
    if (!value) {
      return undefined;
    }
    const matched = assets.find((asset) => asset.id === value || asset.path === value);
    return matched?.id ?? value;
  }, [assets, value]);

  return (
    <div className="admin-asset-field">
      <SearchablePickerField
        label={label}
        value={normalizedValue}
        options={options}
        placeholder={`Filter ${types.join(", ")} assets`}
        onChange={onChange}
      />
      <div className="admin-asset-field-path">
        Effective path: {value ? resolveAssetPath(value, new Map(assets.map((asset) => [asset.id, asset]))) : "none"}
      </div>
    </div>
  );
}

