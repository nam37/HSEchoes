import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { BootstrapData, CellFace, Direction, RunState, Zone } from "../../../shared/src/index";
import { findRoomContaining, findZoneEdge, resolveEdgeType } from "../../../shared/src/index";
import { isPassageBlocked } from "../lib/dungeonUtils";

interface DungeonViewportProps {
  bootstrap: BootstrapData;
  run: RunState;
}

const roomSize = 10;
const wallHeight = 5;

type SquareRelation = "current" | Direction;

export function DungeonViewport({ bootstrap, run }: DungeonViewportProps): JSX.Element {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const textureLoaderRef = useRef(new THREE.TextureLoader());

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

    const zone: Zone | undefined = bootstrap.zones[0];
    if (!zone) {
      return;
    }

    const px = run.posX;
    const py = run.posY;
    const inventorySet = new Set(run.player.inventory);
    const wallTexture = tryTexture(textureLoaderRef.current, bootstrap.assets.wallTexture);
    const floorTexture = tryTexture(textureLoaderRef.current, bootstrap.assets.floorTexture);

    // Sci-fi corridor lighting: cool overhead strip + faint forward fill
    const ambient = new THREE.AmbientLight("#8ab4d4", 0.7);
    const overhead = new THREE.PointLight("#aaccff", 80, 32, 1.6);
    overhead.position.set(0, 4.5, 0);
    const fill = new THREE.PointLight("#6699cc", 30, 20, 2.0);
    fill.position.set(0, 2.0, 3);
    scene.add(ambient, overhead, fill);

    scene.background = new THREE.Color("#080c12");
    scene.fog = new THREE.FogExp2("#0a1020", 0.022);

    const floorMaterial = new THREE.MeshStandardMaterial({
      color: "#1c2535",
      roughness: 0.6,
      metalness: 0.55,
      emissive: "#060b14",
    });

    const wallMaterial = new THREE.MeshStandardMaterial({
      color: "#2a3545",
      roughness: 0.55,
      metalness: 0.6,
      emissive: "#0a1020",
    });

    const doorMaterial = new THREE.MeshStandardMaterial({
      color: "#3a5070",
      roughness: 0.4,
      metalness: 0.75,
      emissive: "#0d1e30",
    });

    const gateMaterial = new THREE.MeshStandardMaterial({
      color: "#1a4080",
      roughness: 0.2,
      metalness: 0.9,
      emissive: "#0a2040",
    });

    // Render current square + 4 adjacent squares
    const renderSquares: Array<{ sx: number; sy: number; relation: SquareRelation }> = [
      { sx: px,     sy: py,     relation: "current" },
      { sx: px,     sy: py - 1, relation: "north"   },
      { sx: px + 1, sy: py,     relation: "east"    },
      { sx: px,     sy: py + 1, relation: "south"   },
      { sx: px - 1, sy: py,     relation: "west"    },
    ];

    for (const { sx, sy, relation } of renderSquares) {
      // Only render squares that are in a known room
      if (!findRoomContaining(zone, sx, sy)) {
        continue;
      }
      const offsetX = (sx - px) * roomSize;
      const offsetZ = (sy - py) * roomSize;
      addSquare(
        scene,
        zone,
        sx,
        sy,
        inventorySet,
        offsetX,
        offsetZ,
        floorMaterial,
        wallMaterial,
        doorMaterial,
        gateMaterial,
        relation
      );
    }

    if (run.combat) {
      const enemy = bootstrap.enemies.find((entry) => entry.id === run.combat?.enemyId);
      const sprite = enemy ? tryTexture(textureLoaderRef.current, enemy.spritePath) : null;
      const material = new THREE.SpriteMaterial({
        color: "#80ccff",
        map: sprite ?? undefined,
      });
      const billboard = new THREE.Sprite(material);
      billboard.position.set(0, 2.25, -4.8);
      billboard.scale.set(3.2, 4.2, 1);
      scene.add(billboard);
    }

    placeCamera(camera, run.facing);
    renderer.render(scene, camera);
  }, [bootstrap, run]);

  return <div className="viewport-shell" ref={mountRef} aria-label="Dungeon viewport" />;
}

function addSquare(
  scene: THREE.Scene,
  zone: Zone,
  sx: number,
  sy: number,
  inventory: Set<string>,
  offsetX: number,
  offsetZ: number,
  floorMaterial: THREE.Material,
  wallMaterial: THREE.Material,
  doorMaterial: THREE.Material,
  gateMaterial: THREE.Material,
  relation: SquareRelation
): void {
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
  const room = findRoomContaining(zone, sx, sy);
  const ceilingColor = room?.ceilingColor ?? "#020810";
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(roomSize, roomSize),
    new THREE.MeshStandardMaterial({ color: ceilingColor, roughness: 1 })
  );
  ceiling.position.set(offsetX, wallHeight, offsetZ);
  ceiling.rotation.x = Math.PI / 2;
  scene.add(ceiling);

  // Prop
  if (relation === "current" && room?.prop) {
    const prop = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 2, 1.5),
      new THREE.MeshStandardMaterial({
        color: "#0a1530",
        roughness: 0.6,
        metalness: 0.8,
        emissive: "#040c1c",
      })
    );
    prop.position.set(offsetX, 1, offsetZ - 1);
    scene.add(prop);
  }

  const wallDefs: Array<{ direction: Direction; position: [number, number, number]; rotation: number }> = [
    { direction: "north", position: [offsetX, wallHeight / 2, offsetZ - roomSize / 2], rotation: 0 },
    { direction: "east",  position: [offsetX + roomSize / 2, wallHeight / 2, offsetZ], rotation: -Math.PI / 2 },
    { direction: "south", position: [offsetX, wallHeight / 2, offsetZ + roomSize / 2], rotation: Math.PI },
    { direction: "west",  position: [offsetX - roomSize / 2, wallHeight / 2, offsetZ], rotation: Math.PI / 2 },
  ];

  for (const wall of wallDefs) {
    if (relation !== "current") {
      // For neighbor squares, skip the face that looks back toward the player
      if (wall.direction === oppositeDirection(relation as Direction)) {
        continue;
      }
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(roomSize, wallHeight), wallMaterial);
      mesh.position.set(...wall.position);
      mesh.rotation.y = wall.rotation;
      scene.add(mesh);
      continue;
    }

    const face: CellFace = resolveEdgeType(zone, sx, sy, wall.direction);

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

function tryTexture(loader: THREE.TextureLoader, src: string): THREE.Texture | null {
  try {
    return loader.load(src);
  } catch {
    return null;
  }
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
  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(sideW, wallHeight), wallMaterial);
  leftWall.position.set(-(roomSize / 2 - sideW / 2), wallHeight / 2, 0);
  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(sideW, wallHeight), wallMaterial);
  rightWall.position.set(roomSize / 2 - sideW / 2, wallHeight / 2, 0);

  const aboveH = wallHeight - 4.2;
  const aboveWall = new THREE.Mesh(new THREE.PlaneGeometry(4.0, aboveH), wallMaterial);
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
    color: "#0a1428",
    roughness: 0.5,
    metalness: 0.9,
    emissive: "#040810",
  });
  const bandMaterial = new THREE.MeshStandardMaterial({
    color: "#004080",
    roughness: 0.3,
    metalness: 0.95,
    emissive: "#002040",
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
    color: "#0060ff",
    roughness: 0.2,
    metalness: 0.85,
    emissive: "#003090",
    emissiveIntensity: 0.8,
  });
  const braceMaterial = new THREE.MeshStandardMaterial({
    color: "#0040a0",
    roughness: 0.3,
    metalness: 0.9,
    emissive: "#002060",
  });

  const opacity = blocked ? 0.92 : 0.28;
  const backing = new THREE.Mesh(
    new THREE.PlaneGeometry(3.1, 3.5),
    new THREE.MeshStandardMaterial({
      color: blocked ? "#002860" : "#0040a0",
      roughness: 0.3,
      metalness: 0.8,
      emissive: blocked ? "#001030" : "#002050",
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
  }
}
