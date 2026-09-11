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

## Envíos y retiro en tienda

Configúralo en `/admin/envios`:

- **Retiro en tienda**: gratis, una sola dirección/local. Actívalo/desactívalo y edita dirección/horario ahí — se muestra tal cual al cliente en el checkout.
- **Envío a domicilio**: precio **por comuna** (346 comunas de Chile, agrupadas por región para que sea manejable — usa "Aplicar a toda la región" para llenar varias de una vez y después ajustas comuna por comuna si hace falta). Una comuna sin precio puesto **no aparece** como opción en el checkout — no hay envío "gratis por accidente" a una comuna que no le pusiste precio.

El precio de envío que paga el cliente siempre se recalcula en el servidor a partir de la comuna elegida (`ShippingComunaRate` en `prisma/schema.prisma`) — igual que el precio de los productos, nunca se confía en lo que mande el navegador. La lista de comunas/regiones vive en `src/lib/chile-comunas.ts` (datos fijos de la división administrativa de Chile, no editables desde el admin — lo único editable es el precio por comuna).

## Zona de impresión según la talla

El cliente ya no ve ningún recuadro delimitador — el área máxima de impresión es invisible y se calcula así (`src/lib/size-scale.ts`):

- El tamaño que defines en el editor de zonas (paso 4 arriba) es el tamaño para una prenda talla **M**.
- Si cargaste las medidas reales por talla (paso 2), el tamaño final = tamaño M × (medida de la talla elegida / medida de la talla M). Para vistas de Frente/Espalda se usa el ancho de pecho; para vistas de Manga se usa el largo de manga.
- Si no cargaste medidas para una talla (o para ninguna), el área de impresión se queda tal cual la definiste, sin escalar.

El cliente puede mover su diseño o texto a **cualquier parte de la prenda** (no solo un lugar fijo) — lo único que se limita es el TAMAÑO: mientras escala, si supera el máximo real permitido para su talla, se ajusta solo de vuelta a ese máximo (manteniendo la proporción). El tamaño real en cm siempre se ve pegado al propio recuadro de selección del diseño (los controles de esquina que ya aparecen al seleccionarlo).

## Texto sobre el diseño

El cliente puede agregar texto encima de su diseño (o solo, sin subir imagen) con "+ Agregar texto": elige entre 13 tipografías y cualquier color. Al agregar al carrito, si hay texto se aplana todo (diseño + texto) en una sola imagen PNG — así el archivo final que ves en Pedidos ya viene listo para imprimir tal cual se ve en el mockup.

## Recortar imagen

Botón "Recortar imagen" (junto a los de quitar fondo) — independiente de esas herramientas, sirve para CUALQUIER imagen subida, tenga o no que ver con transparencia: el cliente arrastra un recuadro sobre la parte que quiere conservar (mover y redimensionar por las esquinas) y presiona "Aplicar recorte". Útil, por ejemplo, para recortar una foto rectangular a solo la parte que quiere imprimir, sin depender de quitar ningún color de fondo.

## Quitar fondo del diseño

Tres formas, las tres 100% en el navegador del cliente — nada se sube a ningún servicio externo, cero costo por uso. Las tres recortan automáticamente el sobrante transparente al terminar (`src/lib/crop-transparent.ts`), así el archivo final queda ajustado al arte real — no al tamaño de la foto original — y las medidas en cm que ve el cliente reflejan el diseño real, no una caja con relleno invisible:

- **"Quitar fondo blanco"** (`src/lib/remove-white-bg.ts`) — un clic, para el caso más común (diseño exportado con fondo blanco).
- **"Elegir color de fondo"** (`src/lib/remove-color-bg.ts`) — para cualquier OTRO color de fondo plano (negro, un color de marca, etc.): el cliente hace clic sobre el color que quiere quitar, se toma esa muestra directamente del canvas y se hace transparente todo lo que esté cerca de ese color.
- **"Aislar sujeto (IA)"** (`src/lib/segment-subject.ts`) — para una FOTO real con fondo complejo (una persona, mascota u objeto sobre un fondo que no es un color plano). Corre un modelo de IA (U2Net-portable / "u2netp", pesos con licencia Apache-2.0) vía `onnxruntime-web` (MIT) enteramente en el navegador del cliente — nunca se sube la foto a ningún servidor. El modelo (~4.5MB) y el runtime WASM (~11MB) están en `public/models/` y `public/ort/` (se descargan una sola vez, el navegador los cachea después). Es gratis pero más lento (unos segundos) y de menor calidad que un servicio pago tipo remove.bg — se eligió así a propósito para no generar costo por imagen mientras el sitio no tiene tráfico; si más adelante conviene mejor calidad, cambiar a una API paga es un reemplazo acotado a este archivo.

Se descartó `@imgly/background-removal` (mejor calidad, misma idea) porque su licencia es AGPL — usarla habría obligado legalmente a publicar todo el código de la tienda como open source salvo que se pague una licencia comercial a IMG.LY.

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
- `onnxruntime-web` (motor de IA para "Aislar sujeto") no agregó vulnerabilidades nuevas al `npm audit` — las 5 reportadas ya existían antes por fabric/postcss/tar (ver arriba).

## Descargar el archivo original que subió el cliente

En `/admin/pedidos`, cada producto de cada pedido tiene su propia sección **"Imagen original (sin editar)"**, con una miniatura visible por cada vista (Frente/Espalda/Manga) y un link para descargar el archivo completo — es el archivo tal cual lo subió el cliente, ANTES de cualquier procesamiento (quitar fondo, recorte, agregar texto). Si el cliente usó texto, el mockup que ves en el pedido es la imagen aplanada con el texto encima, pero esta sección sigue mostrando el archivo original sin texto — para producción normalmente vas a querer el archivo aplanado (es lo que se ve en el mockup), pero si necesitas el arte original en alta resolución para volver a trabajarlo, está acá. Pedidos de antes de esta función no tienen el original guardado por separado — la miniatura cae de vuelta al archivo que sí se guardó en ese momento.

## Estructura

- `/admin` — panel de administración (productos, pedidos), protegido por contraseña.
- `/productos/[slug]` — ficha de producto con el editor de mockup.
- `/carrito`, `/checkout` — carrito y pago.
- `prisma/schema.prisma` — modelo de datos.
