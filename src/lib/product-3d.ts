// Products that have a 3D garment model for the "Ver en 3D" preview, by product slug. The model is a lightweight GLB
// (shape only, no texture) in public/models; the viewer paints it in the chosen color and projects the design on it.
export type Model3D = { url: string; frontSign: 1 | -1 };

export const MODELS_3D: Record<string, Model3D> = {
  "hoodie-oversize": { url: "/models/hoodie-oversize.glb", frontSign: 1 },
};
