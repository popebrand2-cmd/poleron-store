"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CHILE_COMUNAS } from "@/lib/chile-comunas";

type RateInput = { comuna: string; priceCLP: number };
type Settings = { pickupEnabled: boolean; pickupAddress: string; pickupHours: string };

export default function ShippingForm({
  initialRates,
  initialSettings,
}: {
  initialRates: RateInput[];
  initialSettings: Settings;
}) {
  const router = useRouter();

  const [prices, setPrices] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const r of initialRates) map[r.comuna] = String(r.priceCLP);
    return map;
  });
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [bulkByRegion, setBulkByRegion] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const regions = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const c of CHILE_COMUNAS) {
      if (!map.has(c.region)) map.set(c.region, []);
      map.get(c.region)!.push(c.comuna);
    }
    return Array.from(map.entries());
  }, []);

  const configuredCount = Object.values(prices).filter((v) => v.trim() !== "").length;

  function applyToRegion(region: string, comunas: string[]) {
    const value = bulkByRegion[region];
    if (value === undefined || value.trim() === "") return;
    setPrices((prev) => {
      const next = { ...prev };
      for (const comuna of comunas) next[comuna] = value;
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const rates: RateInput[] = Object.entries(prices)
        .filter(([, v]) => v.trim() !== "")
        .map(([comuna, v]) => ({ comuna, priceCLP: Math.max(0, Math.round(Number(v))) }))
        .filter((r) => Number.isFinite(r.priceCLP));

      const res = await fetch("/api/admin/shipping", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rates, storeSettings: settings }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al guardar.");
      setSaved(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Retiro en tienda</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.pickupEnabled}
            onChange={(e) => setSettings((s) => ({ ...s, pickupEnabled: e.target.checked }))}
          />
          Ofrecer retiro en tienda (gratis)
        </label>
        <div>
          <label className="mb-1 block text-sm font-medium">Dirección</label>
          <input
            value={settings.pickupAddress}
            onChange={(e) => setSettings((s) => ({ ...s, pickupAddress: e.target.value }))}
            placeholder="Las Camelias 812, Estación Central"
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Horario (opcional)</label>
          <input
            value={settings.pickupHours}
            onChange={(e) => setSettings((s) => ({ ...s, pickupHours: e.target.value }))}
            placeholder="Lunes a viernes, 10:00 a 18:00"
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-neutral-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Envío a domicilio por comuna</h2>
          <span className="text-sm text-neutral-500">
            {configuredCount} / {CHILE_COMUNAS.length} configuradas
          </span>
        </div>
        <p className="text-sm text-neutral-500">
          Solo las comunas con un precio puesto aquí aparecen como opción de envío para el cliente — el resto queda
          excluida del checkout hasta que le pongas precio. Usa &quot;Aplicar a toda la región&quot; para llenar
          varias de una vez y después ajusta comuna por comuna si hace falta.
        </p>

        {regions.map(([region, comunas]) => {
          const configuredInRegion = comunas.filter((c) => (prices[c] ?? "").trim() !== "").length;
          return (
            <details key={region} className="rounded-lg border border-neutral-200">
              <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium">
                {region}{" "}
                <span className="font-normal text-neutral-500">
                  ({configuredInRegion}/{comunas.length})
                </span>
              </summary>
              <div className="space-y-3 border-t border-neutral-200 p-4">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    placeholder="Precio CLP para toda la región"
                    value={bulkByRegion[region] ?? ""}
                    onChange={(e) => setBulkByRegion((prev) => ({ ...prev, [region]: e.target.value }))}
                    className="w-56 rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => applyToRegion(region, comunas)}
                    className="text-sm font-medium text-fuchsia-600 hover:underline"
                  >
                    Aplicar a toda la región
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {comunas.map((comuna) => (
                    <label key={comuna} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate">{comuna}</span>
                      <input
                        type="number"
                        min={0}
                        value={prices[comuna] ?? ""}
                        onChange={(e) => setPrices((prev) => ({ ...prev, [comuna]: e.target.value }))}
                        placeholder="—"
                        className="w-24 rounded-md border border-neutral-300 px-2 py-1"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </details>
          );
        })}
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && !error && <p className="text-sm text-emerald-600">Guardado.</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="rounded-md bg-neutral-900 px-6 py-3 text-sm font-medium text-white disabled:opacity-50"
      >
        {saving ? "Guardando..." : "Guardar cambios"}
      </button>
    </div>
  );
}
