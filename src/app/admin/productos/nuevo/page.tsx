import ProductForm from "@/components/admin/ProductForm";

export default function NewProductPage() {
  return (
    <main className="p-6">
      <h1 className="mx-auto mb-6 max-w-3xl text-2xl font-semibold">Nuevo producto</h1>
      <ProductForm />
    </main>
  );
}
