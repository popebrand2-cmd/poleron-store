# Poleron Store

Tienda de ropa personalizada: subes tus prendas base (frente/espalda/manga), el cliente sube su diseño y lo ubica dentro de la zona de impresión que definiste, y compra con pago real vía Mercado Pago.

**En producción:** https://poleron-store-production.up.railway.app (desplegado en Railway, conectado a este repositorio — cada push a `main` se publica solo).

## Correr en desarrollo

```bash
npm install
npm run dev
```

Abre http://localhost:3000. El panel de administración está en `/admin` (contraseña definida en `.env`, cámbiala antes de usar la tienda en serio).

> Nota Windows: si `npm run dev` falla con un error `EXDEV` al escribir en `AppData\Roaming`, es porque esa carpeta está en un disco distinto al de OneDrive/roaming en este equipo. Soluciónalo apuntando `APPDATA` a una carpeta local antes de correrlo: `set APPDATA=%cd%\.localappdata`.

## Agregar productos

1. Entra a `/admin`, crea el producto: nombre, precio, tallas.
2. Por cada talla, si tienes la tabla de medidas real del proveedor, completa ancho de pecho / largo total / largo de manga (cm). Son opcionales, pero si las cargas el área de impresión se ajusta sola por talla (ver más abajo) — si las dejas vacías, el área de impresión queda fija para todas las tallas.
3. Por cada color, sube una foto por vista (Frente, Espalda, Manga izquierda/derecha) — deben ser fotos reales de la prenda **en blanco**, sin diseño.
4. Ajusta el rectángulo de la zona de impresión sobre cada foto (arrastra para mover, la esquina para redimensionar). Estas medidas son la referencia para la **talla M** — el cliente ya no puede arrastrar este recuadro; el sitio lo escala solo según la talla que elija (ver más abajo).
5. Publica el producto.

## Zona de impresión según la talla

El cliente ya no ve ningún recuadro delimitador — el área máxima de impresión es invisible y se calcula así (`src/lib/size-scale.ts`):

- El tamaño que defines en el editor de zonas (paso 4 arriba) es el tamaño para una prenda talla **M**.
- Si cargaste las medidas reales por talla (paso 2), el tamaño final = tamaño M × (medida de la talla elegida / medida de la talla M). Para vistas de Frente/Espalda se usa el ancho de pecho; para vistas de Manga se usa el largo de manga.
- Si no cargaste medidas para una talla (o para ninguna), el área de impresión se queda tal cual la definiste, sin escalar.

El cliente mueve/escala/rota su diseño o texto libremente, y mientras lo hace ve el tamaño real en cm pegado al propio recuadro de selección de su diseño (los controles de esquina que ya aparecen al seleccionarlo) — no hay un recuadro aparte marcando el límite. Si intenta agrandarlo más allá del área máxima permitida para su talla, el diseño simplemente se recorta (clip) al llegar a ese borde invisible.

## Texto sobre el diseño

El cliente puede agregar texto encima de su diseño (o solo, sin subir imagen) con "+ Agregar texto": elige entre 13 tipografías y cualquier color. Al agregar al carrito, si hay texto se aplana todo (diseño + texto) en una sola imagen PNG — así el archivo final que ves en Pedidos ya viene listo para imprimir tal cual se ve en el mockup.

## "¿Cómo se vería puesto?"

Botón junto a "Agregar al carrito" (`src/components/TryOnEditor.tsx`). El cliente sube una foto suya, le quitamos el fondo a la captura del mockup (reutilizando `remove-white-bg.ts`) y la deja como una capa que puede mover/escalar/rotar sobre su foto para verse "con la prenda puesta". Todo pasa en el navegador del cliente — la foto que sube nunca se envía al servidor ni se guarda en ningún lado, solo se puede descargar como PNG desde su propio dispositivo. No hay ajuste de pose ni de cuerpo real (no es un probador con IA) — es una superposición simple, igual de espíritu que el resto del editor de mockup.

## Pagos con Mercado Pago

Por defecto la tienda corre en "modo de prueba": los pedidos se guardan pero no se cobra nada real. Para activar cobros:

1. En tu cuenta de Mercado Pago, ve a [mercadopago.cl/developers/panel/app](https://www.mercadopago.cl/developers/panel/app) y crea una aplicación.
2. Copia tu **Access Token** (usa primero el de prueba — "Credenciales de prueba" — antes de pasar a producción).
3. Agrega la variable de entorno:
   ```
   MERCADOPAGO_ACCESS_TOKEN="..."
   NEXT_PUBLIC_BASE_URL="https://tu-dominio-o-el-de-railway"
   ```
   En Railway: pestaña **Variables** del servicio → **+ New Variable** → Deploy.
4. Mercado Pago necesita poder llamar a `NEXT_PUBLIC_BASE_URL/api/mercadopago/webhook` desde internet — no funciona en `localhost`, solo una vez desplegada la tienda.

## Hosting (Railway)

- **Servicio**: `poleron-store`, desplegado desde este repo de GitHub (auto-deploy activado en `main`).
- **Disco persistente**: un volumen (`poleron-store-volume`) montado en `/data`, donde viven la base de datos (`DATABASE_URL=file:/data/dev.db`) y las imágenes subidas (`UPLOADS_DIR=/data/uploads`). Sin este volumen se perdería todo en cada redeploy — no lo elimines.
- **Dominio**: Railway genera uno gratis (`*.up.railway.app`); se puede reemplazar por uno propio desde Settings → Networking → Custom Domain cuando compres uno.
- **Costo**: plan Hobby (~US$5/mes) + centavos de disco. Sin mensualidad de plataforma tipo Shopify.

## Antes de vender en serio

- **Cambia `ADMIN_PASSWORD`** en las variables de Railway (no lo dejes en el valor por defecto).
- La base de datos es SQLite en el volumen persistente. Railway tiene backups de volumen en planes pagos — revisa esa opción o exporta el archivo periódicamente si el catálogo/pedidos crecen mucho. Migrar a Postgres (Neon/Supabase tienen plan gratuito) es sencillo con Prisma si hace falta más adelante.
- Queda una vulnerabilidad de severidad media/alta reportada por `npm audit` en una dependencia interna de Next.js (`postcss`), cuyo único fix disponible hoy es saltar a Next 16 (cambio mayor). No es explotable en el uso normal de la tienda; considera migrar cuando tengas tiempo para probar el upgrade con calma.
- `fabric` está fijado en `6.5.4` a propósito: la `7.4.0` tiene un bug real que dibuja las imágenes a la mitad de su tamaño (rompe el editor de mockup por completo). La `6.5.4` tiene una vulnerabilidad de XSS reportada, pero solo afecta a quien use su función de exportar a SVG — esta tienda nunca la usa, así que no es explotable aquí. No actualices `fabric` sin probar a fondo que el mockup se siga viendo bien.
- El `tar` crítico que reporta `npm audit` es una dependencia de instalación (usada por `sharp`/Prisma al compilar), no corre en la tienda en producción — no es explotable desde el sitio web.

## Estructura

- `/admin` — panel de administración (productos, pedidos), protegido por contraseña.
- `/productos/[slug]` — ficha de producto con el editor de mockup.
- `/carrito`, `/checkout` — carrito y pago.
- `prisma/schema.prisma` — modelo de datos.
