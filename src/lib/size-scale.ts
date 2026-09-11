// The admin sets each view's maxWidthCm/maxHeightCm against a size-M
// garment. When real per-size measurements are on file, the print zone the
// customer sees auto-scales from that M baseline instead of staying fixed
// for every talla.
export type SizeMeasurements = {
  label: string;
  chestCm?: number | null;
  lengthCm?: number | null;
  sleeveCm?: number | null;
};

const REFERENCE_SIZE_LABEL = "M";

export function zoneScaleFactor(sizes: SizeMeasurements[], selectedLabel: string, viewLabel: string): number {
  const reference = sizes.find((s) => s.label.toUpperCase() === REFERENCE_SIZE_LABEL);
  const selected = sizes.find((s) => s.label === selectedLabel);
  if (!reference || !selected) return 1;

  // Sleeve views scale off sleeve length; front/back scale off chest width.
  const isSleeve = viewLabel.toLowerCase().includes("manga");
  const refValue = isSleeve ? reference.sleeveCm : reference.chestCm;
  const selectedValue = isSleeve ? selected.sleeveCm : selected.chestCm;
  if (!refValue || !selectedValue) return 1;

  return selectedValue / refValue;
}
