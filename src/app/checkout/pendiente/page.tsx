import Link from "next/link";

export default function CheckoutPendingPage() {
  return (
    <main className="bg-black px-6 py-16">
      <div className="relative mx-auto max-w-xl overflow-hidden rounded-2xl bg-white p-10 text-center text-neutral-900">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-neon" />
        <h1 className="mb-3 text-2xl font-semibold">Tu pago no se completó</h1>
        <p className="text-neutral-600">
          El pago quedó pendiente o fue rechazado. Puedes volver a intentarlo desde tu carrito.
        </p>
        <Link href="/carrito" className="mt-8 inline-block text-green-700 hover:underline">
          Volver al carrito
        </Link>
      </div>
    </main>
  );
}
