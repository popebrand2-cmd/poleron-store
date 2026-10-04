"use client";

import { useEffect, useRef, useState } from "react";
import type { BufferGeometry, Mesh, Texture } from "three";

export type Viewer3DView = { label: string; photoUrl: string };

type Props = {
  modelUrl: string;
  // Which side of the model (its z axis) is the front of the garment.
  frontSign?: 1 | -1;
  colorHex: string;
  // The "Frente" / "Espalda" photos of the chosen color: they say where the garment sits inside the frame the editor draws in.
  views: Viewer3DView[];
  // The design layer of a view as a transparent PNG covering the whole photo frame (null = nothing printed there).
  getLayer: (label: string) => string | null;
  title: string;
  onClose: () => void;
};

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar una imagen para el 3D."));
    img.src = url;
  });
}

// Where the garment sits in its photo (fractions 0-1 of the width / height): the box of the opaque pixels, or of the
// non-white ones when the photo has no transparency.
function garmentFractions(img: HTMLImageElement) {
  const w = 300;
  const h = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * w));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { x0: 0, y0: 0, x1: 1, y1: 1 };
  ctx.drawImage(img, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  let transparent = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] < 250) transparent++;
  const useAlpha = transparent > d.length / 4 / 50;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const on = useAlpha ? d[i + 3] > 24 : d[i + 3] > 24 && (d[i] < 238 || d[i + 1] < 238 || d[i + 2] < 238);
      if (on) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return { x0: 0, y0: 0, x1: 1, y1: 1 };
  return { x0: x0 / w, y0: y0 / h, x1: (x1 + 1) / w, y1: (y1 + 1) / h };
}

export default function HoodieViewer3D({ modelUrl, frontSign = 1, colorHex, views, getLayer, title, onClose }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  const goRef = useRef<(side: "front" | "back") => void>(() => {});
  const colorRef = useRef<(hex: string) => void>(() => {});

  // The viewer is rebuilt only when the model or the photos change; a color change just re-tints the material.
  useEffect(() => {
    colorRef.current(colorHex);
  }, [colorHex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const viewsKey = views.map((v) => `${v.label}|${v.photoUrl}`).join(",");
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      try {
        const THREE = await import("three");
        const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
        const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
        const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");
        if (disposed) return;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.NoToneMapping;
        host.appendChild(renderer.domElement);
        renderer.domElement.style.display = "block";
        renderer.domElement.style.touchAction = "none";

        const scene = new THREE.Scene();
        const pmrem = new THREE.PMREMGenerator(renderer);
        const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        scene.environment = envTex;
        scene.environmentIntensity = 0.85;
        const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 50);
        // The lights ride on the camera, so the side being looked at (front or back) is always lit the same way.
        scene.add(camera);
        const key = new THREE.DirectionalLight(0xffffff, 1.5);
        key.position.set(1.1, 1.5, 2.2);
        camera.add(key);
        const fill = new THREE.DirectionalLight(0xffffff, 0.55);
        fill.position.set(-1.6, 0.4, 1.4);
        camera.add(fill);
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enablePan = false;
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.minDistance = 1.3;
        controls.maxDistance = 4;
        controls.minPolarAngle = Math.PI * 0.2;
        controls.maxPolarAngle = Math.PI * 0.8;

        const gltf = await new GLTFLoader().loadAsync(modelUrl);
        if (disposed) return;
        let src: Mesh | null = null;
        gltf.scene.updateMatrixWorld(true);
        gltf.scene.traverse((o) => {
          if (!src && (o as Mesh).isMesh) src = o as Mesh;
        });
        if (!src) throw new Error("El modelo 3D no tiene malla.");
        const geometry: BufferGeometry = (src as Mesh).geometry.clone();
        geometry.applyMatrix4((src as Mesh).matrixWorld);
        geometry.computeBoundingBox();
        const bb = geometry.boundingBox!;
        const center = bb.getCenter(new THREE.Vector3());
        geometry.translate(-center.x, -center.y, -center.z);
        geometry.computeVertexNormals();
        geometry.computeBoundingBox();
        const size = geometry.boundingBox!.getSize(new THREE.Vector3());

        const material = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.92, metalness: 0, side: THREE.DoubleSide });
        const garment = new THREE.Mesh(geometry, material);
        scene.add(garment);
        // Dark garments get less light so black stays black instead of washing out to grey.
        colorRef.current = (hex) => {
          material.color.set(hex);
          const lum = material.color.r * 0.299 + material.color.g * 0.587 + material.color.b * 0.114;
          const dark = lum < 0.1;
          scene.environmentIntensity = dark ? 0.45 : 0.85;
          key.intensity = dark ? 1.1 : 1.5;
          fill.intensity = dark ? 0.35 : 0.55;
        };
        colorRef.current(colorHex);

        // The print: the front-facing (or back-facing) triangles of the garment, copied just above the cloth, with
        // texture coordinates from a flat projection that lines the garment up with its photo — so the design sits on the
        // garment where the editor shows it, at the same size.
        const textures: Texture[] = [];
        const overlays: Mesh[] = [];
        const pos = geometry.getAttribute("position");
        const nor = geometry.getAttribute("normal");
        const index = geometry.getIndex();
        const triCount = index ? index.count / 3 : pos.count / 3;
        const eps = size.x * 0.0035;

        for (const v of views) {
          const layerUrl = getLayer(v.label);
          if (!layerUrl) continue;
          const [layerImg, photoImg] = await Promise.all([loadImage(layerUrl), loadImage(v.photoUrl)]);
          if (disposed) return;
          const g = garmentFractions(photoImg);
          const photoAspect = photoImg.naturalHeight / photoImg.naturalWidth; // H / W
          const gcx = (g.x0 + g.x1) / 2;
          const gcy = (g.y0 + g.y1) / 2;
          const k = (g.x1 - g.x0) / size.x; // photo-width fractions per model unit (same scale in x and y: no stretching)
          const isFront = v.label === "Frente";
          const side = isFront ? frontSign : -frontSign;
          const flip = isFront ? 1 : -1;

          const positions: number[] = [];
          const uvs: number[] = [];
          const normals: number[] = [];
          const vert = (i: number) => {
            const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
            const nx = nor.getX(i), ny = nor.getY(i), nz = nor.getZ(i);
            positions.push(x + nx * eps, y + ny * eps, z + nz * eps);
            normals.push(nx, ny, nz);
            uvs.push(gcx + flip * x * k, 1 - gcy + (y * k) / photoAspect);
          };
          for (let t = 0; t < triCount; t++) {
            const a = index ? index.getX(t * 3) : t * 3;
            const b = index ? index.getX(t * 3 + 1) : t * 3 + 1;
            const c = index ? index.getX(t * 3 + 2) : t * 3 + 2;
            const na = nor.getZ(a) * side, nb = nor.getZ(b) * side, nc = nor.getZ(c) * side;
            // Folds tilt some normals sideways: keep those triangles too, or the print would show holes at the creases.
            if ((na + nb + nc) / 3 > 0.12 && na > -0.3 && nb > -0.3 && nc > -0.3) {
              vert(a);
              vert(b);
              vert(c);
            }
          }
          if (!positions.length) continue;
          const og = new THREE.BufferGeometry();
          og.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
          og.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
          og.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
          const tex = new THREE.Texture(layerImg);
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
          tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
          tex.needsUpdate = true;
          textures.push(tex);
          const om = new THREE.MeshStandardMaterial({
            map: tex,
            transparent: true,
            roughness: 0.9,
            metalness: 0,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -4,
            polygonOffsetUnits: -4,
          });
          const mesh = new THREE.Mesh(og, om);
          mesh.renderOrder = 2;
          scene.add(mesh);
          overlays.push(mesh);
        }

        // Camera: fit the garment, start on the front. Going to a side turns the camera around smoothly.
        const fit = () => {
          const w = host.clientWidth || 1;
          const h = host.clientHeight || 1;
          renderer.setSize(w, h, false);
          renderer.domElement.style.width = `${w}px`;
          renderer.domElement.style.height = `${h}px`;
          camera.aspect = w / h;
          const vFov = (camera.fov * Math.PI) / 180;
          const needH = size.y * 1.25;
          const needW = (size.x * 1.15) / camera.aspect;
          const dist = Math.max(needH, needW) / 2 / Math.tan(vFov / 2) + size.z / 2;
          const dir = camera.position.clone().normalize();
          if (!isFinite(dir.length()) || camera.position.lengthSq() < 1e-6) dir.set(0, 0.05, frontSign).normalize();
          camera.position.copy(dir.multiplyScalar(dist));
          controls.maxDistance = dist * 1.8;
          controls.minDistance = dist * 0.55;
          camera.updateProjectionMatrix();
        };
        camera.position.set(0, 0.06, frontSign);
        fit();
        camera.lookAt(0, 0, 0);
        controls.update();
        const ro = new ResizeObserver(fit);
        ro.observe(host);

        let anim: { from: number; to: number; t0: number } | null = null;
        goRef.current = (sideName) => {
          const cur = Math.atan2(camera.position.x, camera.position.z);
          const target = sideName === "front" ? (frontSign === 1 ? 0 : Math.PI) : frontSign === 1 ? Math.PI : 0;
          let delta = target - cur;
          while (delta > Math.PI) delta -= Math.PI * 2;
          while (delta < -Math.PI) delta += Math.PI * 2;
          anim = { from: cur, to: cur + delta, t0: performance.now() };
        };

        renderer.setAnimationLoop(() => {
          if (anim) {
            const p = Math.min(1, (performance.now() - anim.t0) / 700);
            const e = 1 - Math.pow(1 - p, 3);
            const a = anim.from + (anim.to - anim.from) * e;
            const r = Math.hypot(camera.position.x, camera.position.z);
            camera.position.x = Math.sin(a) * r;
            camera.position.z = Math.cos(a) * r;
            if (p >= 1) anim = null;
          }
          controls.update();
          renderer.render(scene, camera);
        });
        setState("ready");

        cleanup = () => {
          renderer.setAnimationLoop(null);
          ro.disconnect();
          controls.dispose();
          geometry.dispose();
          material.dispose();
          overlays.forEach((m) => {
            m.geometry.dispose();
            (m.material as { dispose: () => void }).dispose();
          });
          textures.forEach((t) => t.dispose());
          envTex.dispose();
          pmrem.dispose();
          renderer.dispose();
          renderer.forceContextLoss();
          renderer.domElement.remove();
        };
        if (disposed) cleanup();
      } catch (e) {
        console.error("3D viewer:", e);
        if (!disposed) setState("failed");
      }
    })();

    return () => {
      disposed = true;
      cleanup();
    };
    // colorHex is applied through colorRef, so it must not rebuild the scene
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelUrl, frontSign, viewsKey]);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={`${title} en 3D`}>
      <div className="relative flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-neutral-950 text-white ring-1 ring-white/15">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-neon">Vista 3D</p>
            <h2 className="font-display text-2xl font-bold uppercase leading-none">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar la vista 3D"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/25 text-xl transition hover:border-neon hover:text-neon"
          >
            ×
          </button>
        </div>

        <div className="relative h-[58vh] min-h-[320px] w-full bg-[radial-gradient(70%_60%_at_50%_40%,#2a2a2a,#0a0a0a)] sm:h-[62vh]">
          <div ref={hostRef} className="absolute inset-0" />
          {state === "loading" && <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-neutral-400">Armando tu polerón en 3D…</p>}
          {state === "failed" && (
            <p className="absolute inset-0 flex items-center justify-center px-8 text-center text-sm text-neutral-300">
              Tu navegador no pudo abrir la vista 3D. Sigue con el editor de arriba: tu diseño no se pierde.
            </p>
          )}
          {state === "ready" && <p className="pointer-events-none absolute bottom-2 left-0 right-0 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">Arrastra para girar · pellizca o rueda para acercar</p>}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
          <div className="flex gap-2">
            <button type="button" onClick={() => goRef.current("front")} className="min-h-10 rounded-full border-2 border-white/30 px-5 text-xs font-bold uppercase tracking-wide transition hover:border-neon hover:text-neon">
              Frente
            </button>
            <button type="button" onClick={() => goRef.current("back")} className="min-h-10 rounded-full border-2 border-white/30 px-5 text-xs font-bold uppercase tracking-wide transition hover:border-neon hover:text-neon">
              Espalda
            </button>
          </div>
          <p className="max-w-sm text-[11px] leading-snug text-neutral-400">Vista previa aproximada. La posición y el tamaño exactos son los del editor.</p>
        </div>
      </div>
    </div>
  );
}
