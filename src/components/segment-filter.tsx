/**
 * Az seçenekli filtreler (Durum: Tümü / Aktif / Pasif gibi) için açılır liste yerine yan yana seçenek butonları.
 * Radyo düğmesidir: AutoForm içinde seçim değişince filtre hemen uygulanır. "Tümü" boş değer gönderir.
 */
export function SegmentFilter({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value?: string;
  options: { value: string; label: string }[];
}) {
  const current = value ?? "";
  return (
    <div>
      <span className="label" id={`${name}-label`}>{label}</span>
      <div role="radiogroup" aria-labelledby={`${name}-label`} className="segment">
        {[{ value: "", label: "Tümü" }, ...options].map((o) => (
          <label key={o.value || "tumu"} className="segment-item">
            <input type="radio" name={name} value={o.value} defaultChecked={current === o.value} className="sr-only" />
            {o.label}
          </label>
        ))}
      </div>
    </div>
  );
}
