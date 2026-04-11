import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { AssetDef, BootstrapData, CellFace, Direction, PropDef, ResolvedRoomSurfaces, RunState, TextureSet, Zone, ZoneRoom } from "../../../shared/src/index";
import { findRoomContaining, findZoneEdge, resolveEdgeType, resolveRoomSurfaces } from "../../../shared/src/index";
import { resolveAssetPath } from "../lib/assets";

interface DungeonViewportProps {
  bootstrap: BootstrapData;
  run: RunState;
  assetMap: Map<string, AssetDef>;
  textureSetMap: Map<string, TextureSet>;
}

const roomSize = 10;
const wallHeight = 5;

type SquareRelation = "current" | Direction | "outer";

export function DungeonViewport({ bootstrap, run, assetMap, textureSetMap }: DungeonViewportProps): JSX.Element {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const textureLoaderRef = useRef(new THREE.TextureLoader());
  const gltfLoaderRef = useRef(new GLTFLoader());
  const textureCacheRef = useRef(new Map<string, THREE.Texture | null>());
  const textureVariantCacheRef = useRef(new Map<string, THREE.Texture | null>());
  const modelTemplateCacheRef = useRef(new Map<string, THREE.Object3D | null>());
  const pendingModelLoadsRef = useRef(new Map<string, Promise<THREE.Object3D | null>>());
  const sceneBuildIdRef = useRef(0);

  useEffect(() => {
    if (!mountRef.current || rendererRef.current) {
      return;
    }

    const mount = mountRef.current;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(65, 1, 0.1, 160);
    rendererRef.current = renderer;
    sceneRef.current = scene;
    cameraRef.current = camera;

    const resize = () => {
      if (!rendererRef.current || !cameraRef.current) {
        return;
      }
      const nextWidth = mount.clientWidth || 900;
      const nextHeight = mount.clientHeight || 520;
      rendererRef.current.setSize(nextWidth, nextHeight, false);
      cameraRef.current.aspect = nextWidth / nextHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.render(scene, camera);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    window.addEventListener("resize", resize);
    resize();
    renderer.setAnimationLoop(() => {
      renderer.render(scene, camera);
    });

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
      renderer.setAnimationLoop(null);
      renderer.dispose();
      disposeTextureCache(textureVariantCacheRef.current);
      disposeTextureCache(textureCacheRef.current);
      disposeModelTemplateCache(modelTemplateCacheRef.current);
      pendingModelLoadsRef.current.clear();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
    };
  }, []);

  useEffect(() => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!renderer || !scene || !camera) {
      return;
    }

    clearScene(scene);
    const buildId = ++sceneBuildIdRef.current;

    const zone: Zone | undefined = bootstrap.zones.find(z => z.id === run.zoneId) ?? bootstrap.zones[0];
    if (!zone) {
      return;
    }
    const propMap = new Map(bootstrap.props.map((prop) => [prop.id, prop]));

    const px = run.posX;
    const py = run.posY;
    const inventorySet = new Set(run.player.inventory);
    const materialCache = new Map<string, THREE.Material>();
    const visibleRooms = new Map<string, ZoneRoom>();

    // Sci-fi corridor lighting: bright overhead strips + forward fill
    const ambient = new THREE.AmbientLight("#c8d8e0", 1.1);
    const overhead = new THREE.PointLight("#d8eaf8", 120, 38, 1.4);
    overhead.position.set(0, 4.5, 0);
    const fill = new THREE.PointLight("#b0ccd8", 50, 24, 1.8);
    fill.position.set(0, 2.0, 3);
    scene.add(ambient, overhead, fill);

    scene.background = new THREE.Color("#10141a");
    scene.fog = new THREE.FogExp2("#14181e", 0.018);

    const doorMaterial = new THREE.MeshStandardMaterial({
      color: "#6888a0",
      roughness: 0.35,
      metalness: 0.65,
      emissive: "#10202e",
    });

    const gateMaterial = new THREE.MeshStandardMaterial({
      color: "#4a6888",
      roughness: 0.2,
      metalness: 0.85,
      emissive: "#0e1e30",
    });

    placeCamera(camera, run.facing);

    // Render a 5×5 grid around the player (up to 25 cells; void cells skipped below).
    // The 4 direct cardinal neighbours get their own relation so the back-face skip works.
    // Everything else in the grid is "outer" — all 4 faces resolved via resolveEdgeType.
    const renderSquares: Array<{ sx: number; sy: number; relation: SquareRelation }> = [
      { sx: px, sy: py, relation: "current" },
      { sx: px,     sy: py - 1, relation: "north" },
      { sx: px + 1, sy: py,     relation: "east"  },
      { sx: px,     sy: py + 1, relation: "south" },
      { sx: px - 1, sy: py,     relation: "west"  },
    ];
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (dx === 0 && dy === 0) continue;                    // current — already added
        if (Math.abs(dx) + Math.abs(dy) === 1) continue;       // cardinals — already added
        renderSquares.push({ sx: px + dx, sy: py + dy, relation: "outer" });
      }
    }

    for (const { sx, sy, relation } of renderSquares) {
      // Only render squares that are in a known room
      const room = findRoomContaining(zone, sx, sy);
      if (!room) {
        continue;
      }
      visibleRooms.set(room.id, room);
      const offsetX = (sx - px) * roomSize;
      const offsetZ = (sy - py) * roomSize;
      addSquare(
        scene,
        zone,
        assetMap,
        textureSetMap,
        sx,
        sy,
        inventorySet,
        offsetX,
        offsetZ,
        materialCache,
        textureLoaderRef.current,
        textureCacheRef.current,
        textureVariantCacheRef.current,
        doorMaterial,
        gateMaterial,
        relation
      );
    }

    for (const room of visibleRooms.values()) {
      const prop = room.prop ? propMap.get(room.prop) : undefined;
      if (!prop || prop.renderHint === "none") {
        continue;
      }
      renderRoomProp(
        scene,
        room,
        prop,
        px,
        py,
        assetMap,
        camera,
        textureLoaderRef.current,
        gltfLoaderRef.current,
        textureCacheRef.current,
        modelTemplateCacheRef.current,
        pendingModelLoadsRef.current,
        buildId,
        sceneBuildIdRef
      );
    }

    if (run.combat) {
      const enemy = bootstrap.enemies.find((entry) => entry.id === run.combat?.enemyId);
      const sprite = enemy ? tryTexture(textureLoaderRef.current, resolveAssetPath(enemy.spritePath, assetMap)) : null;
      const material = new THREE.SpriteMaterial({
        color: "#80ccff",
        map: sprite ?? undefined,
      });
      const billboard = new THREE.Sprite(material);
      billboard.position.set(0, 2.25, -4.8);
      billboard.scale.set(3.2, 4.2, 1);
      scene.add(billboard);
    }

    renderer.render(scene, camera);
  }, [assetMap, bootstrap, run, textureSetMap]);

  return <div className="viewport-shell" ref={mountRef} aria-label="Dungeon viewport" />;
}

function addSquare(
  scene: THREE.Scene,
  zone: Zone,
  assetMap: Map<string, AssetDef>,
  textureSetMap: Map<string, TextureSet>,
  sx: number,
  sy: number,
  inventory: Set<string>,
  offsetX: number,
  offsetZ: number,
  materialCache: Map<string, THREE.Material>,
  loader: THREE.TextureLoader,
  textureCache: Map<string, THREE.Texture | null>,
  textureVariantCache: Map<string, THREE.Texture | null>,
  doorMaterial: THREE.Material,
  gateMaterial: THREE.Material,
  relation: SquareRelation
): void {
  const room = findRoomContaining(zone, sx, sy);
  if (!room) return;
  const surfaces = resolveRoomSurfaces(zone, room, { assetMap, textureSetMap });
  const floorMaterial = getSurfaceMaterial("floor", surfaces, materialCache, loader, textureCache, textureVariantCache);
  const wallMaterial = getSurfaceMaterial("wall", surfaces, materialCache, loader, textureCache, textureVariantCache);
  const ceilingMaterial = getSurfaceMaterial("ceiling", surfaces, materialCache, loader, textureCache, textureVariantCache);

  // Floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(roomSize, roomSize), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(offsetX, 0, offsetZ);
  scene.add(floor);

  // Grid overlay
  const grid = new THREE.GridHelper(roomSize, 10, "#003860", "#001530");
  grid.position.set(offsetX, 0.015, offsetZ);
  scene.add(grid);

  // Ceiling
  const ceilingColor = surfaces.ceilingColor;
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(roomSize, roomSize), ceilingMaterial);
  ceiling.position.set(offsetX, wallHeight, offsetZ);
  ceiling.rotation.x = Math.PI / 2;
  scene.add(ceiling);

  // Ceiling-tinted fill light — only on the current cell so the room atmosphere
  // picks up the ceiling colour without multiplying lights for every rendered cell.
  if (relation === "current") {
    const ceilLight = new THREE.PointLight(ceilingColor, 18, 22, 1.6);
    ceilLight.position.set(offsetX, wallHeight - 0.3, offsetZ);
    scene.add(ceilLight);
  }

  // Terminal — wall-mounted console with glowing screen, visible from adjacent rooms
  if (room?.terminalId) {
    const group = new THREE.Group();

    // Console body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.9, 0.7),
      new THREE.MeshStandardMaterial({ color: "#283038", roughness: 0.5, metalness: 0.8, emissive: "#0a0e14" })
    );
    body.position.set(0, 0.45, 0);

    // Screen bezel
    const bezel = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.95, 0.12),
      new THREE.MeshStandardMaterial({ color: "#202830", roughness: 0.4, metalness: 0.85, emissive: "#080c10" })
    );
    bezel.position.set(0, 1.37, 0.06);
    bezel.rotation.x = -0.22; // slight tilt toward viewer

    // Screen surface — emissive green
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(1.25, 0.75),
      new THREE.MeshStandardMaterial({
        color: "#00c870",
        roughness: 0.2,
        metalness: 0.0,
        emissive: "#00c870",
        emissiveIntensity: 1.0,
      })
    );
    screen.position.set(0, 1.37, 0.13);
    screen.rotation.x = -0.22;

    group.add(body, bezel, screen);
    // Place against the west wall, offset from center — keeps north/south passages clear
    group.position.set(offsetX - 2.8, 0, offsetZ - 3.2);
    scene.add(group);

    // Soft green screen-glow light
    const glow = new THREE.PointLight("#00c870", 4, 7, 2);
    glow.position.set(offsetX - 2.8, 1.5, offsetZ - 3.0);
    scene.add(glow);
  }

  const wallDefs: Array<{ direction: Direction; position: [number, number, number]; rotation: number }> = [
    { direction: "north", position: [offsetX, wallHeight / 2, offsetZ - roomSize / 2], rotation: 0 },
    { direction: "east",  position: [offsetX + roomSize / 2, wallHeight / 2, offsetZ], rotation: -Math.PI / 2 },
    { direction: "south", position: [offsetX, wallHeight / 2, offsetZ + roomSize / 2], rotation: Math.PI },
    { direction: "west",  position: [offsetX - roomSize / 2, wallHeight / 2, offsetZ], rotation: Math.PI / 2 },
  ];

  for (const wall of wallDefs) {
    if (relation === "outer") {
      const outerFace = resolveEdgeType(zone, sx, sy, wall.direction);
      if (outerFace === "open") continue;
      if (outerFace === "wall") {
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(roomSize, wallHeight), wallMaterial);
        mesh.position.set(...wall.position);
        mesh.rotation.y = wall.rotation;
        scene.add(mesh);
      } else {
        // door or gate visible in the distance — render the passage frame so it
        // doesn't appear as a plain wall when seen through an adjacent open passage
        const edgeReq = findZoneEdge(zone, sx, sy, wall.direction)?.requirement;
        const blocked = edgeReq ? !inventory.has(edgeReq.itemId) : false;
        addPassageFrame(
          scene,
          wall.position,
          wall.rotation,
          outerFace === "gate" ? gateMaterial : doorMaterial,
          wallMaterial,
          outerFace,
          blocked
        );
      }
      continue;
    }

    if (relation !== "current") {
      // Cardinal neighbours: skip the face that looks back toward the player
      if (wall.direction === oppositeDirection(relation as Direction)) {
        continue;
      }
      const neighbourFace = resolveEdgeType(zone, sx, sy, wall.direction);
      if (neighbourFace === "open") continue; // interior or free passage — no geometry
      if (neighbourFace === "wall") {
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(roomSize, wallHeight), wallMaterial);
        mesh.position.set(...wall.position);
        mesh.rotation.y = wall.rotation;
        scene.add(mesh);
      } else {
        // door or gate on the far side of a neighbour — render the full passage frame
        // so the player can see it through the opening of the current cell's door
        const edgeReq = findZoneEdge(zone, sx, sy, wall.direction)?.requirement;
        const blocked = edgeReq ? !inventory.has(edgeReq.itemId) : false;
        addPassageFrame(
          scene,
          wall.position,
          wall.rotation,
          neighbourFace === "gate" ? gateMaterial : doorMaterial,
          wallMaterial,
          neighbourFace,
          blocked
        );
      }
      continue;
    }

    const face: CellFace = resolveEdgeType(zone, sx, sy, wall.direction);

    if (face === "open") continue; // interior boundary or open passage — no geometry

    if (face === "wall") {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(roomSize, wallHeight), wallMaterial);
      mesh.position.set(...wall.position);
      mesh.rotation.y = wall.rotation;
      scene.add(mesh);
      continue;
    }

    const edgeReq = findZoneEdge(zone, sx, sy, wall.direction)?.requirement;
    const blocked = edgeReq ? !inventory.has(edgeReq.itemId) : false;
    addPassageFrame(
      scene,
      wall.position,
      wall.rotation,
      face === "gate" ? gateMaterial : face === "door" ? doorMaterial : wallMaterial,
      wallMaterial,
      face,
      blocked
    );
  }
}

function renderRoomProp(
  scene: THREE.Scene,
  room: ZoneRoom,
  prop: PropDef,
  px: number,
  py: number,
  assetMap: Map<string, AssetDef>,
  camera: THREE.PerspectiveCamera,
  textureLoader: THREE.TextureLoader,
  gltfLoader: GLTFLoader,
  textureCache: Map<string, THREE.Texture | null>,
  modelTemplateCache: Map<string, THREE.Object3D | null>,
  pendingModelLoads: Map<string, Promise<THREE.Object3D | null>>,
  buildId: number,
  sceneBuildIdRef: React.MutableRefObject<number>
): void {
  const modelPath = resolveModelAssetPath(prop.modelAssetId, assetMap);
  if (modelPath) {
    void addRoomPropModel(
      scene,
      room,
      prop,
      px,
      py,
      gltfLoader,
      modelPath,
      modelTemplateCache,
      pendingModelLoads,
      buildId,
      sceneBuildIdRef,
      () => addRoomPropBillboard(scene, room, prop, px, py, assetMap, camera, textureLoader, textureCache)
    );
    return;
  }

  addRoomPropBillboard(scene, room, prop, px, py, assetMap, camera, textureLoader, textureCache);
}

async function addRoomPropModel(
  scene: THREE.Scene,
  room: ZoneRoom,
  prop: PropDef,
  px: number,
  py: number,
  loader: GLTFLoader,
  src: string,
  modelTemplateCache: Map<string, THREE.Object3D | null>,
  pendingModelLoads: Map<string, Promise<THREE.Object3D | null>>,
  buildId: number,
  sceneBuildIdRef: React.MutableRefObject<number>,
  fallback: () => void
): Promise<void> {
  const template = await getCachedModelTemplate(loader, src, modelTemplateCache, pendingModelLoads);
  if (buildId !== sceneBuildIdRef.current) {
    return;
  }
  if (!template) {
    fallback();
    return;
  }

  const instance = createDetachedModelInstance(template);
  placeRoomPropModel(instance, room, prop, px, py);
  if (buildId !== sceneBuildIdRef.current) {
    disposeObject(instance);
    return;
  }
  scene.add(instance);
}

function addRoomPropBillboard(
  scene: THREE.Scene,
  room: ZoneRoom,
  prop: PropDef,
  px: number,
  py: number,
  assetMap: Map<string, AssetDef>,
  camera: THREE.PerspectiveCamera,
  loader: THREE.TextureLoader,
  textureCache: Map<string, THREE.Texture | null>
): void {
  const propTexture = getPropTexture(prop.assetId, assetMap, loader, textureCache);
  const billboard = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 1.6),
    new THREE.MeshBasicMaterial({
      map: propTexture,
      transparent: true,
      alphaTest: 0.15,
      side: THREE.DoubleSide,
    })
  );
  const anchor = getRoomPropAnchor(room, prop.id, px, py);
  billboard.position.copy(anchor);
  billboard.lookAt(camera.position.x, billboard.position.y, camera.position.z);
  scene.add(billboard);
}

function getRoomPropAnchor(room: ZoneRoom, propId: string, px: number, py: number): THREE.Vector3 {
  const roomCenterX = ((room.x + (room.w - 1) / 2) - px) * roomSize;
  const roomCenterZ = ((room.y + (room.h - 1) / 2) - py) * roomSize;
  const northWallZ = (room.y - py) * roomSize - roomSize / 2;

  if (propId === "coolant_pool") {
    return new THREE.Vector3(roomCenterX, 0.08, roomCenterZ);
  }

  return new THREE.Vector3(roomCenterX, 0.95, northWallZ + 0.55);
}

function placeRoomPropModel(instance: THREE.Object3D, room: ZoneRoom, prop: PropDef, px: number, py: number): void {
  const bounds = new THREE.Box3().setFromObject(instance);
  const size = bounds.getSize(new THREE.Vector3());
  const targetWidth = prop.id === "coolant_pool" ? roomSize * Math.max(0.6, room.w * 0.75) : roomSize * Math.min(0.38 * room.w, 0.8);
  const targetDepth = prop.id === "coolant_pool" ? roomSize * Math.max(0.6, room.h * 0.75) : roomSize * 0.26;
  const targetHeight = prop.id === "coolant_pool" ? 0.35 : 2.3;
  const scale = Math.min(
    targetWidth / Math.max(size.x, 0.001),
    targetDepth / Math.max(size.z, 0.001),
    targetHeight / Math.max(size.y, 0.001)
  );
  instance.scale.multiplyScalar(scale);
  instance.updateMatrixWorld(true);

  const scaledBounds = new THREE.Box3().setFromObject(instance);
  const scaledSize = scaledBounds.getSize(new THREE.Vector3());
  const anchor = getRoomPropAnchor(room, prop.id, px, py);

  let targetX = anchor.x;
  let targetZ = anchor.z;
  if (prop.id !== "coolant_pool") {
    targetZ += scaledSize.z / 2;
  }

  const center = scaledBounds.getCenter(new THREE.Vector3());
  instance.position.x += targetX - center.x;
  instance.position.y += -scaledBounds.min.y;
  instance.position.z += targetZ - center.z;
}

function resolveModelAssetPath(assetId: string | undefined, assetMap: Map<string, AssetDef>): string | undefined {
  if (!assetId) {
    return undefined;
  }
  const asset = assetMap.get(assetId);
  if (asset?.type === "mesh") {
    return asset.path;
  }
  return assetId.startsWith("/") ? assetId : undefined;
}

async function getCachedModelTemplate(
  loader: GLTFLoader,
  src: string,
  modelTemplateCache: Map<string, THREE.Object3D | null>,
  pendingModelLoads: Map<string, Promise<THREE.Object3D | null>>
): Promise<THREE.Object3D | null> {
  if (modelTemplateCache.has(src)) {
    return modelTemplateCache.get(src) ?? null;
  }

  const pending = pendingModelLoads.get(src);
  if (pending) {
    return pending;
  }

  const load = loader
    .loadAsync(src)
    .then((gltf) => {
      const template = gltf.scene;
      modelTemplateCache.set(src, template);
      pendingModelLoads.delete(src);
      return template;
    })
    .catch(() => {
      modelTemplateCache.set(src, null);
      pendingModelLoads.delete(src);
      return null;
    });

  pendingModelLoads.set(src, load);
  return load;
}

function createDetachedModelInstance(template: THREE.Object3D): THREE.Object3D {
  const clone = template.clone(true);
  clone.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.geometry = mesh.geometry.clone();
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map((material) => material.clone());
      } else if (mesh.material) {
        mesh.material = mesh.material.clone();
      }
      mesh.castShadow = false;
      mesh.receiveShadow = false;
    }
  });
  return clone;
}

function tryTexture(loader: THREE.TextureLoader, src: string): THREE.Texture | null {
  try {
    const texture = loader.load(src);
    configureTextureSampling(texture);
    return texture;
  } catch {
    return null;
  }
}

function getSurfaceMaterial(
  surface: "wall" | "floor" | "ceiling",
  surfaces: ResolvedRoomSurfaces,
  materialCache: Map<string, THREE.Material>,
  loader: THREE.TextureLoader,
  textureCache: Map<string, THREE.Texture | null>,
  textureVariantCache: Map<string, THREE.Texture | null>
): THREE.Material {
  const src =
    surface === "wall" ? surfaces.wallTexture :
    surface === "floor" ? surfaces.floorTexture :
    surfaces.ceilingTexture;

  const repeat = surface === "wall" ? [2, 1] as const : [2, 2] as const;
  const cacheKey = `${surface}|${src ?? ""}|${surfaces.ceilingColor}`;
  const cached = materialCache.get(cacheKey);
  if (cached) return cached;

  const map = src ? getCachedTextureVariant(loader, src, repeat[0], repeat[1], textureCache, textureVariantCache) : null;
  const tintColor = getRoomTintColor(surface, surfaces.ceilingColor);
  const material = new THREE.MeshStandardMaterial(
    surface === "ceiling"
      ? {
          color: tintColor,
          map: map ?? undefined,
          roughness: 0.9,
          metalness: 0.1,
          emissive: tintColor.clone(),
          emissiveIntensity: map ? 0.28 : 0.4,
        }
      : surface === "floor"
        ? {
            color: tintColor,
            map: map ?? undefined,
            roughness: 0.74,
            metalness: 0.16,
            emissive: tintColor.clone().multiplyScalar(0.08),
          }
        : {
            color: tintColor,
            map: map ?? undefined,
            roughness: 0.68,
            metalness: 0.18,
            emissive: tintColor.clone().multiplyScalar(0.1),
          }
  );
  materialCache.set(cacheKey, material);
  return material;
}

function getRoomTintColor(surface: "wall" | "floor" | "ceiling", roomColor: string): THREE.Color {
  const source = new THREE.Color(roomColor);
  const hsl = { h: 0, s: 0, l: 0 };
  source.getHSL(hsl);

  const boosted = new THREE.Color().setHSL(
    hsl.h,
    Math.max(hsl.s, 0.45),
    surface === "wall"
      ? Math.max(hsl.l, 0.48)
      : surface === "floor"
        ? Math.max(hsl.l, 0.42)
        : Math.max(hsl.l, 0.58)
  );

  const neutral =
    surface === "wall" ? new THREE.Color("#dbe5ee")
    : surface === "floor" ? new THREE.Color("#b8c4ce")
    : new THREE.Color("#f6f9ff");

  const mix =
    surface === "wall" ? 0.82
    : surface === "floor" ? 0.68
    : 0.9;

  return neutral.lerp(boosted, mix);
}

function getCachedTextureVariant(
  loader: THREE.TextureLoader,
  src: string,
  repeatX: number,
  repeatY: number,
  textureCache: Map<string, THREE.Texture | null>,
  textureVariantCache: Map<string, THREE.Texture | null>
): THREE.Texture | null {
  const variantKey = `${src}|${repeatX}|${repeatY}`;
  if (textureVariantCache.has(variantKey)) {
    return textureVariantCache.get(variantKey) ?? null;
  }

  const baseTexture = getCachedTexture(loader, src, textureCache);
  if (!baseTexture) {
    textureVariantCache.set(variantKey, null);
    return null;
  }

  const variant = baseTexture.clone();
  variant.wrapS = THREE.RepeatWrapping;
  variant.wrapT = THREE.RepeatWrapping;
  variant.repeat.set(repeatX, repeatY);
  variant.colorSpace = THREE.SRGBColorSpace;
  variant.needsUpdate = true;
  textureVariantCache.set(variantKey, variant);
  return variant;
}

function getCachedTexture(loader: THREE.TextureLoader, src: string, textureCache: Map<string, THREE.Texture | null>): THREE.Texture | null {
  if (textureCache.has(src)) {
    return textureCache.get(src) ?? null;
  }
  const texture = tryTexture(loader, src);
  if (texture) {
    configureTextureSampling(texture);
  }
  textureCache.set(src, texture);
  return texture;
}

function getPropTexture(
  assetId: string | undefined,
  assetMap: Map<string, AssetDef>,
  loader: THREE.TextureLoader,
  textureCache: Map<string, THREE.Texture | null>
): THREE.Texture {
  const path = assetId ? resolveAssetPath(assetId, assetMap) : "";
  const asset = path ? getCachedTexture(loader, path, textureCache) : null;
  return asset ?? getFallbackQuestionTexture(textureCache);
}

function getFallbackQuestionTexture(textureCache: Map<string, THREE.Texture | null>): THREE.Texture {
  const cacheKey = "__prop-fallback-question__";
  const cached = textureCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (!context) {
    const fallback = new THREE.Texture();
    textureCache.set(cacheKey, fallback);
    return fallback;
  }

  context.clearRect(0, 0, 128, 128);
  context.fillStyle = "#06101a";
  context.fillRect(20, 20, 88, 88);
  context.strokeStyle = "#00d4ff";
  context.lineWidth = 4;
  context.strokeRect(20, 20, 88, 88);
  context.fillStyle = "#7fe7ff";
  context.font = "bold 72px monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("?", 64, 68);

  const texture = new THREE.CanvasTexture(canvas);
  configureTextureSampling(texture);
  texture.needsUpdate = true;
  textureCache.set(cacheKey, texture);
  return texture;
}

function configureTextureSampling(texture: THREE.Texture): void {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestMipmapNearestFilter;
}

function addPassageFrame(
  scene: THREE.Scene,
  position: [number, number, number],
  rotation: number,
  frameMaterial: THREE.Material,
  wallMaterial: THREE.Material,
  face: CellFace,
  blocked: boolean
): void {
  const group = new THREE.Group();

  const left = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.2, 0.45), frameMaterial);
  const right = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.2, 0.45), frameMaterial);
  const top = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.38, 0.45), frameMaterial);
  left.position.set(-1.8, 2.1, 0);
  right.position.set(1.8, 2.1, 0);
  top.position.set(0, 4.05, 0);
  group.add(left, right, top);

  const sideW = 3.0;
  const leftWall = createWallSegmentMesh(sideW, wallHeight, wallMaterial, 0, sideW / roomSize, 0, 1);
  leftWall.position.set(-(roomSize / 2 - sideW / 2), wallHeight / 2, 0);
  const rightWall = createWallSegmentMesh(sideW, wallHeight, wallMaterial, 1 - sideW / roomSize, 1, 0, 1);
  rightWall.position.set(roomSize / 2 - sideW / 2, wallHeight / 2, 0);

  const aboveH = wallHeight - 4.2;
  const aboveWall = createWallSegmentMesh(4.0, aboveH, wallMaterial, sideW / roomSize, 1 - sideW / roomSize, 4.2 / wallHeight, 1);
  aboveWall.position.set(0, 4.2 + aboveH / 2, 0);

  group.add(leftWall, rightWall, aboveWall);

  if (face === "gate") {
    group.add(buildGateBarrier(blocked));
  } else if (face === "door" && blocked) {
    group.add(buildDoorBarrier());
  }

  group.position.set(position[0], 0, position[2]);
  group.rotation.y = rotation;
  scene.add(group);
}

function buildDoorBarrier(): THREE.Group {
  const group = new THREE.Group();
  const panelMaterial = new THREE.MeshStandardMaterial({
    color: "#505860",
    roughness: 0.45,
    metalness: 0.75,
    emissive: "#181e24",
  });
  const bandMaterial = new THREE.MeshStandardMaterial({
    color: "#3a7aaa",
    roughness: 0.3,
    metalness: 0.85,
    emissive: "#0e2840",
  });

  const leftDoor = new THREE.Mesh(new THREE.BoxGeometry(1.45, 3.55, 0.2), panelMaterial);
  const rightDoor = new THREE.Mesh(new THREE.BoxGeometry(1.45, 3.55, 0.2), panelMaterial);
  const band = new THREE.Mesh(new THREE.BoxGeometry(2.95, 0.22, 0.24), bandMaterial);

  leftDoor.position.set(-0.78, 1.775, -0.06);
  rightDoor.position.set(0.78, 1.775, -0.06);
  band.position.set(0, 1.775, -0.08);

  group.add(leftDoor, rightDoor, band);
  return group;
}

function buildGateBarrier(blocked: boolean): THREE.Group {
  const group = new THREE.Group();
  const barMaterial = new THREE.MeshStandardMaterial({
    color: "#40aaff",
    roughness: 0.2,
    metalness: 0.8,
    emissive: "#1050a0",
    emissiveIntensity: 0.6,
  });
  const braceMaterial = new THREE.MeshStandardMaterial({
    color: "#3a6888",
    roughness: 0.3,
    metalness: 0.85,
    emissive: "#0e2030",
  });

  const opacity = blocked ? 0.92 : 0.28;
  const backing = new THREE.Mesh(
    new THREE.PlaneGeometry(3.1, 3.5),
    new THREE.MeshStandardMaterial({
      color: blocked ? "#204060" : "#3878a8",
      roughness: 0.3,
      metalness: 0.75,
      emissive: blocked ? "#081828" : "#102840",
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
    })
  );
  backing.position.set(0, 1.75, -0.03);
  group.add(backing);

  if (blocked) {
    for (const x of [-1.15, -0.38, 0.38, 1.15]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.5, 0.14), barMaterial);
      bar.position.set(x, 1.75, -0.02);
      group.add(bar);
    }
    const brace = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.18, 0.16), braceMaterial);
    brace.position.set(0, 3.55, -0.02);
    group.add(brace);
  }

  return group;
}

function createWallSegmentMesh(
  width: number,
  height: number,
  material: THREE.Material,
  uMin: number,
  uMax: number,
  vMin: number,
  vMax: number
): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(width, height);
  remapPlaneUvs(geometry, uMin, uMax, vMin, vMax);
  return new THREE.Mesh(geometry, material);
}

function remapPlaneUvs(
  geometry: THREE.PlaneGeometry,
  uMin: number,
  uMax: number,
  vMin: number,
  vMax: number
): void {
  const uv = geometry.getAttribute("uv");
  if (!uv || !(uv instanceof THREE.BufferAttribute)) {
    return;
  }

  for (let index = 0; index < uv.count; index += 1) {
    const u = uv.getX(index);
    const v = uv.getY(index);
    uv.setXY(index, THREE.MathUtils.lerp(uMin, uMax, u), THREE.MathUtils.lerp(vMin, vMax, v));
  }

  uv.needsUpdate = true;
}

function placeCamera(camera: THREE.PerspectiveCamera, facing: Direction): void {
  camera.position.set(0, 2.15, 0);
  switch (facing) {
    case "north":
      camera.lookAt(0, 2.1, -12);
      break;
    case "east":
      camera.lookAt(12, 2.1, 0);
      break;
    case "south":
      camera.lookAt(0, 2.1, 12);
      break;
    case "west":
      camera.lookAt(-12, 2.1, 0);
      break;
  }
}

function oppositeDirection(direction: Direction): Direction {
  switch (direction) {
    case "north": return "south";
    case "east":  return "west";
    case "south": return "north";
    case "west":  return "east";
  }
}

function clearScene(scene: THREE.Scene): void {
  while (scene.children.length > 0) {
    const child = scene.children[0];
    scene.remove(child);
    disposeObject(child);
  }
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((material) => material.dispose());
    } else if (mesh.material) {
      mesh.material.dispose();
    }
  });
}

function disposeTextureCache(cache: Map<string, THREE.Texture | null>): void {
  for (const texture of cache.values()) {
    texture?.dispose();
  }
  cache.clear();
}

function disposeModelTemplateCache(cache: Map<string, THREE.Object3D | null>): void {
  for (const template of cache.values()) {
    if (template) {
      disposeObject(template);
    }
  }
  cache.clear();
}
