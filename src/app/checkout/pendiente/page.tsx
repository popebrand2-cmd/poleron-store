import Link from "next/link";

export default function CheckoutPendingPage() {
  return (
    <main className="mx-auto max-w-xl px-6 py-16 text-center">
      <h1 className="mb-3 text-2xl font-semibold">Tu pago no se completó</h1>
      <p className="text-neutral-600">
        El pago quedó pendiente o fue rechazado. Puedes volver a intentarlo desde tu carrito.
      </p>
      <Link href="/carrito" className="mt-8 inline-block text-fuchsia-600 hover:underline">
        Volver al carrito
      </Link>
    </main>
  );
}
