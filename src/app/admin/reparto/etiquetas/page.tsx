import { prisma } from "@/lib/prisma";
import { formatCLP } from "@/lib/money";
import { formatOrderNumber } from "@/lib/order-number";
import PrintButton from "@/components/admin/PrintButton";

export const dynamic = "force-dynamic";

// Printable labels, one per order, in the order of the ids (the route order). A4: 8 labels per sheet (2×4, 100×70 mm each).
// "termica": one 100×150 mm label per page, for a label printer.
export default async function LabelsPage({ searchParams }: { searchParams: Promise<{ ids?: string; size?: string; ruta?: string }> }) {
  const q = await searchParams;
  const ids = (q.ids ?? "").split(",").filter(Boolean).slice(0, 80);
  const thermal = q.size === "termica";
  const withStop = q.ruta === "1";

  const rows = await prisma.order.findMany({
    where: { id: { in: ids } },
    include: { items: { include: { product: { select: { name: true } } } } },
  });
  const orders = ids.map((id) => rows.find((r) => r.id === id)).filter((o): o is NonNullable<typeof o> => Boolean(o));

  const css = `
    .pope-labels{position:fixed;inset:0;z-index:99999;overflow:auto;background:#e5e5e5;color:#000;font-family:Arial,Helvetica,sans-serif}
    .pope-labels .bar{position:sticky;top:0;display:flex;gap:12px;align-items:center;padding:12px 16px;background:#111;color:#fff}
    .pope-labels .sheet{display:grid;grid-template-columns:repeat(${thermal ? 1 : 2},${thermal ? "100mm" : "100mm"});gap:${thermal ? "8mm" : "0"};justify-content:center;padding:${thermal ? "8mm 0" : "6mm 0"}}
    .pope-labels .label{box-sizing:border-box;width:100mm;height:${thermal ? "150mm" : "70mm"};padding:${thermal ? "7mm" : "4mm"};border:1px dashed #999;background:#fff;overflow:hidden;break-inside:avoid;page-break-inside:avoid}
    .pope-labels .num{font-size:${thermal ? "40pt" : "26pt"};font-weight:800;line-height:1}
    .pope-labels .brand{font-size:${thermal ? "11pt" : "8pt"};font-weight:700;letter-spacing:.15em}
    .pope-labels .name{font-size:${thermal ? "16pt" : "11pt"};font-weight:700;margin-top:${thermal ? "5mm" : "2mm"}}
    .pope-labels .addr{font-size:${thermal ? "13pt" : "9.5pt"};margin-top:1mm}
    .pope-labels .items{margin:${thermal ? "5mm 0 0" : "2mm 0 0"};padding:${thermal ? "3mm 0 0" : "1.5mm 0 0"};border-top:1.5px solid #000;font-size:${thermal ? "12pt" : "8.5pt"};line-height:1.25}
    .pope-labels .items li{margin:0 0 .8mm;list-style:none}
    .pope-labels .stop{float:right;font-size:${thermal ? "16pt" : "11pt"};font-weight:800;border:2px solid #000;border-radius:999px;padding:0 3mm}
    @page{size:${thermal ? "100mm 150mm" : "A4"};margin:${thermal ? "0" : "6mm"}}
    @media print{
      body *{visibility:hidden}
      .pope-labels,.pope-labels *{visibility:visible}
      .pope-labels{position:absolute;left:0;top:0;right:auto;bottom:auto;overflow:visible;background:#fff}
      .pope-labels .bar{display:none}
      .pope-labels .sheet{padding:0}
      .pope-labels .label{border:${thermal ? "0" : "1px dashed #bbb"}}
      ${thermal ? ".pope-labels .label{page-break-after:always}" : ""}
    }
  `;

  return (
    <div className="pope-labels">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="bar">
        <strong>{orders.length} etiqueta(s)</strong>
        <span style={{ opacity: 0.7, fontSize: 13 }}>{thermal ? "100×150 mm" : "Hoja A4, 8 por hoja"}</span>
        <PrintButton />
      </div>
      <div className="sheet">
        {orders.map((o, i) => (
          <div key={o.id} className="label">
            {withStop && <span className="stop">Parada {i + 1}</span>}
            <div className="brand">POPE</div>
            <div className="num">{formatOrderNumber(o)}</div>
            <div className="name">{o.customerName}</div>
            <div className="addr">
              {o.shippingMethod === "PICKUP" ? (
                <strong>RETIRO EN TIENDA</strong>
              ) : (
                <>
                  {o.shippingAddr || "—"}
                  <br />
                  <strong>{o.shippingComuna}</strong>
                </>
              )}
              {o.customerPhone ? (
                <>
                  <br />
                  Tel. {o.customerPhone}
                </>
              ) : null}
            </div>
            <ul className="items">
              {o.items.map((it) => (
                <li key={it.id}>
                  <strong>
                    {it.quantity}× {it.product.name}
                  </strong>
                  <br />
                  {[it.colorName, it.sizeLabel ? `Talla ${it.sizeLabel}` : "", it.materialLabel].filter(Boolean).join(" · ")}
                </li>
              ))}
              <li style={{ marginTop: "1mm" }}>Total {formatCLP(o.totalAmount)}</li>
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
