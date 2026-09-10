# Poleron Store

Tienda de ropa personalizada: subes tus prendas base (frente/espalda/manga), el cliente sube su diseño y lo ubica dentro de la zona de impresión que definiste, y compra con pago real vía Flow.cl.

## Correr en desarrollo

```bash
npm install
npm run dev
```

Abre http://localhost:3000. El panel de administración está en `/admin` (contraseña definida en `.env`, cámbiala antes de usar la tienda en serio).

> Nota Windows: si `npm run dev` falla con un error `EXDEV` al escribir en `AppData\Roaming`, es porque esa carpeta está en un disco distinto al de OneDrive/roaming en este equipo. Ya quedó resuelto apuntando `APPDATA` a `.localappdata` dentro del proyecto (ver `.claude/launch.json` / cómo se lanzó el server). Si lo corres manualmente, agrega antes: `set APPDATA=%cd%\.localappdata`.

## Agregar productos

1. Entra a `/admin`, crea el producto: nombre, precio, tallas.
2. Por cada color, sube una foto por vista (Frente, Espalda, Manga izquierda/derecha) — deben ser fotos reales de la prenda **en blanco**, sin diseño.
3. Ajusta el rectángulo de la zona de impresión sobre cada foto (arrastra para mover, la esquina para redimensionar). Esa es el área donde el cliente podrá poner su diseño.
4. Publica el producto.

## Pagos con Flow.cl

Por defecto la tienda corre en "modo de prueba": los pedidos se guardan pero no se cobra nada real. Para activar cobros:

1. Crea una cuenta en [flow.cl](https://www.flow.cl) y obtén tu `apiKey` y `secretKey` (usa el sandbox primero: https://sandbox.flow.cl).
2. Completa en `.env`:
   ```
   FLOW_API_KEY="..."
   FLOW_SECRET_KEY="..."
   FLOW_API_URL="https://sandbox.flow.cl/api"   # cambia a https://www.flow.cl/api en producción
   NEXT_PUBLIC_BASE_URL="https://tu-dominio.cl" # debe ser accesible públicamente para que Flow confirme el pago
   ```
3. Flow necesita poder llamar a `NEXT_PUBLIC_BASE_URL/api/flow/confirm` desde internet — no funciona en `localhost`, solo una vez desplegada la tienda.

## Antes de publicar la tienda

- **Cambia `ADMIN_PASSWORD`** en `.env`.
- **Elige dónde hospedar con cuidado**: las fotos de producto y los diseños de clientes se guardan en disco (`public/uploads`), no en un servicio externo. Esto funciona bien en un VPS o en Railway/Render con un volumen persistente (barato, ~US$5-7/mes), pero **no funciona en Vercel** (su sistema de archivos es efímero: las imágenes subidas se perderían). Si más adelante creces mucho, migrar esas subidas a un bucket S3-compatible (Cloudflare R2, Backblaze B2) es el siguiente paso natural.
- La base de datos es SQLite (`prisma/dev.db`), sin costo. Haz respaldos periódicos de ese archivo (o de todo el volumen persistente). Si el catálogo/pedidos crecen mucho, migrar a Postgres (Neon/Supabase tienen plan gratuito) es sencillo con Prisma.
- Queda una vulnerabilidad de severidad media/alta reportada por `npm audit` en una dependencia interna de Next.js (`postcss`), cuyo único fix disponible hoy es saltar a Next 16 (cambio mayor). No es explotable en el uso normal de la tienda; considera migrar cuando tengas tiempo para probar el upgrade con calma.

## Estructura

- `/admin` — panel de administración (productos, pedidos), protegido por contraseña.
- `/productos/[slug]` — ficha de producto con el editor de mockup.
- `/carrito`, `/checkout` — carrito y pago.
- `prisma/schema.prisma` — modelo de datos.
