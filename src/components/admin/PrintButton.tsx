"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      style={{ marginLeft: "auto", background: "#b6ff00", color: "#000", fontWeight: 700, border: 0, borderRadius: 999, padding: "8px 18px", cursor: "pointer" }}
    >
      Imprimir
    </button>
  );
}
