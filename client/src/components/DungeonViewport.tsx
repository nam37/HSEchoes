import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { BootstrapData, CellFace, Direction, DungeonCell, RunState } from "../../../shared/src/index";

interface DungeonViewportProps {
  bootstrap: BootstrapData;
  run: RunState;
}

const roomSize = 10;
const wallHeight = 5;

type CellRelation = "current" | Direction;

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
    scene.fog = new THREE.FogExp2("#07080d", 0.04);
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

    const currentCell = bootstrap.cells.find((cell) => cell.id === run.cellId);
    if (!currentCell) {
      return;
    }

    const inventorySet = new Set(run.player.inventory);
    const wallTexture = tryTexture(textureLoaderRef.current, bootstrap.assets.wallTexture);
    const floorTexture = tryTexture(textureLoaderRef.current, bootstrap.assets.floorTexture);
    const gateTexture = tryTexture(textureLoaderRef.current, bootstrap.assets.gateTexture);

    const ambient = new THREE.AmbientLight("#9f8c75", 1.05);
    const torch = new THREE.PointLight("#fcb66d", 18, 30, 2);
    torch.position.set(0, 3.7, 1.8);
    scene.add(ambient, torch);

    scene.background = new THREE.Color(currentCell.ceilingColor);

    const floorMaterial = new THREE.MeshStandardMaterial({
      color: "#5e5548",
      map: floorTexture ?? undefined,
      roughness: 0.95,
      metalness: 0.05
    });
    if (floorMaterial.map) {
      floorMaterial.map.wrapS = THREE.RepeatWrapping;
      floorMaterial.map.wrapT = THREE.RepeatWrapping;
      floorMaterial.map.repeat.set(2, 2);
    }

    const wallMaterial = new THREE.MeshStandardMaterial({
      color: "#6c6357",
      map: wallTexture ?? undefined,
      roughness: 0.9,
      metalness: 0.1
    });
    if (wallMaterial.map) {
      wallMaterial.map.wrapS = THREE.RepeatWrapping;
      wallMaterial.map.wrapT = THREE.RepeatWrapping;
      wallMaterial.map.repeat.set(2, 1.2);
    }

    const gateMaterial = new THREE.MeshStandardMaterial({
      color: "#7a766f",
      map: gateTexture ?? undefined,
      roughness: 0.8,
      metalness: 0.35
    });
    const doorMaterial = new THREE.MeshStandardMaterial({
      color: "#6f5436",
      roughness: 0.88,
      metalness: 0.08
    });

    for (const cell of getRenderableCells(bootstrap.cells, currentCell)) {
      const offsetX = (cell.x - currentCell.x) * roomSize;
      const offsetZ = (cell.y - currentCell.y) * roomSize;
      addCell(
        scene,
        cell,
        inventorySet,
        offsetX,
        offsetZ,
        floorMaterial,
        wallMaterial,
        doorMaterial,
        gateMaterial,
        getCellRelation(cell, currentCell)
      );
    }

    if (run.combat) {
      const enemy = bootstrap.enemies.find((entry) => entry.id === run.combat?.enemyId);
      const sprite = enemy ? tryTexture(textureLoaderRef.current, enemy.spritePath) : null;
      const material = new THREE.SpriteMaterial({
        color: "#f2d3a2",
        map: sprite ?? undefined
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

export function getRenderableCells(cells: DungeonCell[], currentCell: DungeonCell): DungeonCell[] {
  return cells.filter((cell) => Math.abs(cell.x - currentCell.x) + Math.abs(cell.y - currentCell.y) <= 1);
}

function addCell(
  scene: THREE.Scene,
  cell: DungeonCell,
  inventory: Set<string>,
  offsetX: number,
  offsetZ: number,
  floorMaterial: THREE.Material,
  wallMaterial: THREE.Material,
  doorMaterial: THREE.Material,
  gateMaterial: THREE.Material,
  relation: CellRelation
): void {
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(roomSize, roomSize), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(offsetX, 0, offsetZ);
  scene.add(floor);

  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(roomSize, roomSize),
    new THREE.MeshStandardMaterial({ color: cell.ceilingColor, roughness: 1 })
  );
  ceiling.position.set(offsetX, wallHeight, offsetZ);
  ceiling.rotation.x = Math.PI / 2;
  scene.add(ceiling);

  if (relation === "current" && cell.prop) {
    const prop = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 2, 1.5),
      new THREE.MeshStandardMaterial({ color: "#68573f", roughness: 0.9 })
    );
    prop.position.set(offsetX, 1, offsetZ - 1);
    scene.add(prop);
  }

  const walls: Array<{ direction: Direction; position: [number, number, number]; rotation: number; face: CellFace }> = [
    { direction: "north", position: [offsetX, wallHeight / 2, offsetZ - roomSize / 2], rotation: 0, face: cell.sides.north },
    { direction: "east", position: [offsetX + roomSize / 2, wallHeight / 2, offsetZ], rotation: -Math.PI / 2, face: cell.sides.east },
    { direction: "south", position: [offsetX, wallHeight / 2, offsetZ + roomSize / 2], rotation: Math.PI, face: cell.sides.south },
    { direction: "west", position: [offsetX - roomSize / 2, wallHeight / 2, offsetZ], rotation: Math.PI / 2, face: cell.sides.west }
  ];

  for (const wall of walls) {
    if (relation !== "current") {
      if (wall.direction === oppositeDirection(relation)) {
        continue;
      }

      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(roomSize, wallHeight), wallMaterial);
      mesh.position.set(...wall.position);
      mesh.rotation.y = wall.rotation;
      scene.add(mesh);
      continue;
    }

    if (wall.face === "wall") {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(roomSize, wallHeight), wallMaterial);
      mesh.position.set(...wall.position);
      mesh.rotation.y = wall.rotation;
      scene.add(mesh);
      continue;
    }

    const blocked = isPassageBlocked(cell, wall.direction, inventory);
    addPassageFrame(
      scene,
      wall.position,
      wall.rotation,
      wall.face === "gate" ? gateMaterial : wall.face === "door" ? doorMaterial : wallMaterial,
      wall.face,
      blocked
    );
  }
}

export function isPassageBlocked(cell: DungeonCell, direction: Direction, inventory: Set<string>): boolean {
  const requirement = cell.passageRequirements?.[direction];
  return Boolean(requirement && !inventory.has(requirement.itemId));
}

function getCellRelation(cell: DungeonCell, currentCell: DungeonCell): CellRelation {
  if (cell.id === currentCell.id) {
    return "current";
  }

  if (cell.x === currentCell.x && cell.y === currentCell.y - 1) {
    return "north";
  }

  if (cell.x === currentCell.x + 1 && cell.y === currentCell.y) {
    return "east";
  }

  if (cell.x === currentCell.x && cell.y === currentCell.y + 1) {
    return "south";
  }

  return "west";
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
  material: THREE.Material,
  face: CellFace,
  blocked: boolean
): void {
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.2, 0.45), material);
  const right = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.2, 0.45), material);
  const top = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.38, 0.45), material);
  const group = new THREE.Group();
  left.position.set(-1.8, 2.1, 0);
  right.position.set(1.8, 2.1, 0);
  top.position.set(0, 4.05, 0);
  group.add(left, right, top);

  if (face === "gate") {
    group.add(buildGateBarrier(blocked));
  } else if (face === "door" && blocked) {
    group.add(buildDoorBarrier());
  }

  group.position.set(...position);
  group.rotation.y = rotation;
  scene.add(group);
}

function buildDoorBarrier(): THREE.Group {
  const group = new THREE.Group();
  const panelMaterial = new THREE.MeshStandardMaterial({ color: "#73502d", roughness: 0.86, metalness: 0.08 });
  const bandMaterial = new THREE.MeshStandardMaterial({ color: "#8d7247", roughness: 0.72, metalness: 0.22 });

  const leftDoor = new THREE.Mesh(new THREE.BoxGeometry(1.45, 3.55, 0.2), panelMaterial);
  const rightDoor = new THREE.Mesh(new THREE.BoxGeometry(1.45, 3.55, 0.2), panelMaterial);
  const band = new THREE.Mesh(new THREE.BoxGeometry(2.95, 0.22, 0.24), bandMaterial);

  leftDoor.position.set(-0.78, 2.02, -0.06);
  rightDoor.position.set(0.78, 2.02, -0.06);
  band.position.set(0, 2.02, -0.08);

  group.add(leftDoor, rightDoor, band);
  return group;
}

function buildGateBarrier(blocked: boolean): THREE.Group {
  const group = new THREE.Group();
  const barMaterial = new THREE.MeshStandardMaterial({ color: "#8a7f70", roughness: 0.62, metalness: 0.5 });
  const braceMaterial = new THREE.MeshStandardMaterial({ color: "#615749", roughness: 0.72, metalness: 0.35 });

  const opacity = blocked ? 0.92 : 0.28;
  const backing = new THREE.Mesh(
    new THREE.PlaneGeometry(3.1, 3.5),
    new THREE.MeshStandardMaterial({
      color: blocked ? "#7f776b" : "#8a7f70",
      roughness: 0.65,
      metalness: 0.45,
      transparent: true,
      opacity,
      side: THREE.DoubleSide
    })
  );
  backing.position.set(0, 2.1, -0.03);
  group.add(backing);

  if (blocked) {
    for (const x of [-1.15, -0.38, 0.38, 1.15]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.5, 0.14), barMaterial);
      bar.position.set(x, 2.05, -0.02);
      group.add(bar);
    }
    const brace = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.18, 0.16), braceMaterial);
    brace.position.set(0, 3.55, -0.02);
    group.add(brace);
  }

  return group;
}

function placeCamera(camera: THREE.PerspectiveCamera, facing: Direction): void {
  camera.position.set(0, 2.15, 1.9);
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
    case "north":
      return "south";
    case "east":
      return "west";
    case "south":
      return "north";
    case "west":
      return "east";
  }
}

function clearScene(scene: THREE.Scene): void {
  while (scene.children.length > 0) {
    const child = scene.children[0];
    scene.remove(child);
  }
}
