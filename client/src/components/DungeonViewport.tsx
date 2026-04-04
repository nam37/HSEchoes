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

type SquareRelation = "current" | Direction | "outer";

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

    // Sci-fi corridor lighting: bright overhead strips + forward fill
    const ambient = new THREE.AmbientLight("#c8d8e0", 1.1);
    const overhead = new THREE.PointLight("#d8eaf8", 120, 38, 1.4);
    overhead.position.set(0, 4.5, 0);
    const fill = new THREE.PointLight("#b0ccd8", 50, 24, 1.8);
    fill.position.set(0, 2.0, 3);
    scene.add(ambient, overhead, fill);

    scene.background = new THREE.Color("#10141a");
    scene.fog = new THREE.FogExp2("#14181e", 0.018);

    const floorMaterial = new THREE.MeshStandardMaterial({
      color: "#2a2e34",
      roughness: 0.55,
      metalness: 0.6,
      emissive: "#0a0c10",
    });

    const wallMaterial = new THREE.MeshStandardMaterial({
      color: "#68747e",
      roughness: 0.5,
      metalness: 0.45,
      emissive: "#141820",
    });

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
  const ceilingColor = room?.ceilingColor ?? "#3a4048";
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(roomSize, roomSize),
    new THREE.MeshStandardMaterial({
      color: ceilingColor,
      emissive: ceilingColor,
      emissiveIntensity: 0.4,
      roughness: 0.9,
    })
  );
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

  // Prop — render in any visible cell (not just current) so it's seen from adjacent rooms
  if (room?.prop) {
    const prop = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 2, 1.5),
      new THREE.MeshStandardMaterial({
        color: "#485060",
        roughness: 0.55,
        metalness: 0.7,
        emissive: "#141820",
      })
    );
    prop.position.set(offsetX, 1, offsetZ - 1);
    scene.add(prop);
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
