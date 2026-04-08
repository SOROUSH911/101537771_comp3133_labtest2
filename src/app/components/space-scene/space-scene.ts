import { Component, ElementRef, AfterViewInit, OnDestroy, ViewChild, NgZone, effect, inject } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { SpacexApiService } from '../../network/spacexapi.service';

@Component({
  selector: 'app-space-scene',
  template: '<canvas #canvas></canvas>',
  styles: [`canvas { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 0; }`],
})
export class SpaceScene implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  private animationId = 0;
  private spacex = inject(SpacexApiService);
  private loadRocketFn: ((id: string) => void) | null = null;
  private zoomFn: ((zoom: boolean) => void) | null = null;

  constructor(private ngZone: NgZone) {
    effect(() => {
      const id = this.spacex.hoveredRocketId();
      if (this.loadRocketFn) this.loadRocketFn(id);
    });
    effect(() => {
      const zoom = this.spacex.zoomToRocket();
      if (this.zoomFn) this.zoomFn(zoom);
    });
  }
  ngAfterViewInit() { this.ngZone.runOutsideAngular(() => this.init()); }
  ngOnDestroy() { cancelAnimationFrame(this.animationId); }

  private init() {
    const canvas = this.canvasRef.nativeElement;

    // ─── SCENE SETUP (identical to mock/index.html) ───
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 2, 12);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    // ─── CONTROLS ───
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false;
    controls.minDistance = 5;
    controls.maxDistance = 50;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.3;
    canvas.addEventListener('pointerdown', () => { controls.autoRotate = false; });
    canvas.addEventListener('pointerup', () => { setTimeout(() => { controls.autoRotate = true; }, 5000); });

    // ─── TEXTURE LOADER ───
    const texLoader = new THREE.TextureLoader();

    // ─── STARFIELD BACKGROUND ───
    const starTex = texLoader.load('assets/textures/stars_milky_way.jpg');
    starTex.mapping = THREE.EquirectangularReflectionMapping;
    starTex.magFilter = THREE.LinearFilter;
    starTex.minFilter = THREE.LinearMipmapLinearFilter;
    starTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    starTex.colorSpace = THREE.SRGBColorSpace;
    scene.background = starTex;

    // ─── ADDITIONAL STAR PARTICLES ───
    const starCount = 6000;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 200 + Math.random() * 400;
      starPos[i3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPos[i3 + 2] = r * Math.cos(phi);
      const colorType = Math.random();
      if (colorType < 0.6) { starColors[i3] = 1; starColors[i3+1] = 1; starColors[i3+2] = 1; }
      else if (colorType < 0.8) { starColors[i3] = 0.7; starColors[i3+1] = 0.8; starColors[i3+2] = 1.0; }
      else { starColors[i3] = 1.0; starColors[i3+1] = 0.9; starColors[i3+2] = 0.7; }
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
      size: 0.3, vertexColors: true, sizeAttenuation: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending,
    })));

    // ─── SUN ───
    const sunPosition = new THREE.Vector3(50, 20, -40);
    const sunGroup = new THREE.Group();
    sunGroup.position.copy(sunPosition);
    scene.add(sunGroup);

    const sunTex = texLoader.load('assets/textures/sun.jpg');
    sunTex.colorSpace = THREE.SRGBColorSpace;
    const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(3, 64, 64), new THREE.MeshBasicMaterial({ map: sunTex }));
    sunGroup.add(sunMesh);

    // Sun plasma overlay
    const sunOverlayMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uSunTex: { value: sunTex } },
      vertexShader: `
        varying vec2 vUv; varying vec3 vNormal; varying vec3 vPosition;
        void main() { vUv = uv; vNormal = normalize(normalMatrix * normal); vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        uniform float uTime; varying vec2 vUv; varying vec3 vNormal; varying vec3 vPosition;
        vec3 mod289(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
        float snoise(vec2 v) {
          const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
          vec2 i = floor(v + dot(v, C.yy)); vec2 x0 = v - i + dot(i, C.xx);
          vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1; i = mod289(i);
          vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
          vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
          m = m*m; m = m*m;
          vec3 x = 2.0 * fract(p * C.www) - 1.0; vec3 h = abs(x) - 0.5;
          vec3 ox = floor(x + 0.5); vec3 a0 = x - ox;
          m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
          vec3 g; g.x = a0.x * x0.x + h.x * x0.y; g.yz = a0.yz * x12.xz + h.yz * x12.yw;
          return 130.0 * dot(m, g); }
        void main() {
          vec2 uv = vUv * 4.0; float n = 0.0;
          n += 0.5 * snoise(uv + uTime * 0.05); n += 0.25 * snoise(uv * 2.0 - uTime * 0.1);
          n += 0.125 * snoise(uv * 4.0 + uTime * 0.15); n += 0.0625 * snoise(uv * 8.0 - uTime * 0.08);
          vec3 hot = vec3(1.0, 0.9, 0.4); vec3 warm = vec3(1.0, 0.45, 0.0);
          vec3 cool = vec3(0.8, 0.15, 0.0); vec3 dark = vec3(0.4, 0.05, 0.0);
          float t = n * 0.5 + 0.5; vec3 col;
          if (t > 0.7) col = mix(warm, hot, (t - 0.7) / 0.3);
          else if (t > 0.4) col = mix(cool, warm, (t - 0.4) / 0.3);
          else col = mix(dark, cool, t / 0.4);
          float fresnel = dot(vNormal, vec3(0.0, 0.0, 1.0));
          float limb = pow(max(fresnel, 0.0), 0.5); col *= 0.6 + 0.4 * limb;
          gl_FragColor = vec4(col, 0.6); }`,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    sunGroup.add(new THREE.Mesh(new THREE.SphereGeometry(3.02, 64, 64), sunOverlayMat));

    // Inner corona
    const coronaInnerMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `varying vec3 vNormal; void main() { vNormal = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uTime; varying vec3 vNormal; void main() {
        float intensity = pow(0.75 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
        intensity *= 0.8 + 0.2 * sin(uTime * 2.0);
        vec3 col = mix(vec3(1.0, 0.6, 0.1), vec3(1.0, 0.2, 0.0), intensity);
        gl_FragColor = vec4(col, intensity * 0.7); }`,
      blending: THREE.AdditiveBlending, side: THREE.BackSide, transparent: true, depthWrite: false,
    });
    sunGroup.add(new THREE.Mesh(new THREE.SphereGeometry(3.8, 64, 64), coronaInnerMat));

    // Outer corona
    const coronaOuterMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `varying vec3 vNormal; void main() { vNormal = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uTime; varying vec3 vNormal; void main() {
        float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
        intensity *= 0.7 + 0.3 * sin(uTime * 1.5 + 1.0);
        gl_FragColor = vec4(vec3(1.0, 0.35, 0.05) * intensity, intensity * 0.4); }`,
      blending: THREE.AdditiveBlending, side: THREE.BackSide, transparent: true, depthWrite: false,
    });
    sunGroup.add(new THREE.Mesh(new THREE.SphereGeometry(5.5, 64, 64), coronaOuterMat));

    // Solar flare rays
    const flareGeo = new THREE.CircleGeometry(0.5, 16);
    const flareMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uTime; varying vec2 vUv; void main() {
        vec2 center = vUv - 0.5; float dist = length(center) * 2.0;
        float ray = smoothstep(1.0, 0.0, dist) * smoothstep(0.3, 0.0, abs(center.y)) * (0.6 + 0.4 * sin(uTime * 3.0));
        gl_FragColor = vec4(mix(vec3(1.0, 0.6, 0.1), vec3(1.0, 0.9, 0.5), ray), ray * 0.5); }`,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    for (let i = 0; i < 16; i++) {
      const flare = new THREE.Mesh(flareGeo, flareMat.clone());
      const angle = (i / 16) * Math.PI * 2;
      flare.position.set(Math.cos(angle) * (3.5 + Math.random() * 2.5), Math.sin(angle) * (3.5 + Math.random() * 2.5), 0);
      flare.rotation.z = angle;
      flare.scale.set(2 + Math.random() * 4, 0.3 + Math.random() * 0.4, 1);
      sunGroup.add(flare);
    }

    // God rays
    const godRayMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uTime; varying vec2 vUv; void main() {
        vec2 center = vUv - 0.5; float dist = length(center) * 2.0;
        float circle = 1.0 - smoothstep(0.7, 1.0, dist);
        float glow = exp(-dist * 5.0) * 0.35;
        float angle = atan(center.y, center.x);
        float rays = pow(abs(sin(angle * 10.0 + uTime * 0.3)), 12.0) * 0.12;
        rays += pow(abs(sin(angle * 6.0 - uTime * 0.2)), 10.0) * 0.06;
        rays *= exp(-dist * 3.5);
        float total = (glow + rays) * circle * (0.85 + 0.15 * sin(uTime * 1.5));
        gl_FragColor = vec4(mix(vec3(1.0, 0.5, 0.1), vec3(1.0, 0.9, 0.5), glow), total); }`,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    const godRay = new THREE.Mesh(new THREE.CircleGeometry(25, 64), godRayMat);
    sunGroup.add(godRay);

    // ─── LIGHTING ───
    scene.add(new THREE.AmbientLight(0x334455, 0.4));
    scene.add(new THREE.HemisphereLight(0x4466aa, 0x221100, 0.3));
    const sunLight = new THREE.DirectionalLight(0xfff5e0, 2.5);
    sunLight.position.copy(sunPosition); scene.add(sunLight);
    const fillLight = new THREE.DirectionalLight(0x8899bb, 0.8);
    fillLight.position.set(-40, -10, 30); scene.add(fillLight);
    const rimLight = new THREE.DirectionalLight(0x00e5ff, 0.4);
    rimLight.position.set(-30, 10, -30); scene.add(rimLight);
    const sunPointLight = new THREE.PointLight(0xffaa33, 4, 120);
    sunPointLight.position.copy(sunPosition); scene.add(sunPointLight);
    const pointLight = new THREE.PointLight(0xff6b35, 1, 30);
    pointLight.position.set(0, -3, 0); scene.add(pointLight);

    // ─── EARTH ───
    const earthGroup = new THREE.Group();
    const earthDayTex = texLoader.load('assets/textures/earth_day.jpg');
    earthDayTex.colorSpace = THREE.SRGBColorSpace;
    earthDayTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const earthNightTex = texLoader.load('assets/textures/earth_night.jpg');
    earthNightTex.colorSpace = THREE.SRGBColorSpace;
    const earthCloudTex = texLoader.load('assets/textures/earth_clouds.jpg');

    const earthMesh = new THREE.Mesh(new THREE.SphereGeometry(2, 64, 64), new THREE.MeshPhongMaterial({
      map: earthDayTex, emissiveMap: earthNightTex, emissive: new THREE.Color(0xffcc88),
      emissiveIntensity: 0.8, specular: new THREE.Color(0x333333), shininess: 15,
    }));
    earthGroup.add(earthMesh);
    const cloudMesh = new THREE.Mesh(new THREE.SphereGeometry(2.02, 64, 64), new THREE.MeshPhongMaterial({
      map: earthCloudTex, transparent: true, opacity: 0.35, depthWrite: false,
    }));
    earthGroup.add(cloudMesh);
    earthGroup.add(new THREE.Mesh(new THREE.SphereGeometry(2.15, 64, 64), new THREE.ShaderMaterial({
      vertexShader: `varying vec3 vNormal; void main() { vNormal = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying vec3 vNormal; void main() { float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.5); gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity; }`,
      blending: THREE.AdditiveBlending, side: THREE.BackSide, transparent: true,
    })));
    earthGroup.position.set(-6, 1, -8);
    scene.add(earthGroup);

    // ─── MOON ───
    const moonTex = texLoader.load('assets/textures/moon.jpg');
    moonTex.colorSpace = THREE.SRGBColorSpace;
    moonTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const moonMesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), new THREE.MeshPhongMaterial({ map: moonTex }));
    scene.add(moonMesh);

    // ─── MARS ───
    const marsTex = texLoader.load('assets/textures/mars.jpg');
    marsTex.colorSpace = THREE.SRGBColorSpace;
    marsTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const marsMesh = new THREE.Mesh(new THREE.SphereGeometry(0.8, 32, 32), new THREE.MeshPhongMaterial({ map: marsTex }));
    marsMesh.position.set(10, -2, -15);
    scene.add(marsMesh);

    // ─── ORBIT RINGS ───
    const createOrbitRing = (radius: number, color: number, pos: THREE.Vector3) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.015, 8, 128),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.2 })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.copy(pos);
      scene.add(ring);
    };
    createOrbitRing(4, 0x00e5ff, new THREE.Vector3(-6, 1, -8));
    createOrbitRing(8, 0xff4444, new THREE.Vector3(-6, 1, -8));

    // ─── ROCKET ───
    const gltfLoader = new GLTFLoader();
    let rocketModel: THREE.Group | null = null;
    const rocketGroup = new THREE.Group();
    rocketGroup.position.set(2, 0, 0);
    scene.add(rocketGroup);

    let rocketBottomY = -3;
    let rocketRadius = 0.3;

    const setupRocket = (gltf: any, targetHeight: number) => {
      rocketModel = gltf.scene;
      let box = new THREE.Box3().setFromObject(rocketModel!);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      rocketModel!.scale.setScalar(targetHeight / maxDim);
      box.setFromObject(rocketModel!);
      const center = box.getCenter(new THREE.Vector3());
      rocketModel!.position.set(-center.x, -center.y, -center.z);
      box.setFromObject(rocketModel!);
      rocketBottomY = box.min.y;
      rocketRadius = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) * 0.25;
      rocketGroup.add(rocketModel!);
      createEngineParticles();
    };

    // Model cache to avoid reloading
    const modelCache: Record<string, THREE.Group> = {};
    let currentRocketId = '';

    const loadRocketModel = (rocketId: string) => {
      if (rocketId === currentRocketId) return;
      currentRocketId = rocketId;
      const path = this.spacex.getRocketModelPath(rocketId);
      const targetHeight = this.spacex.getRocketScale(rocketId);

      if (rocketModel) { rocketGroup.remove(rocketModel); }

      const setupLoadedModel = (model: THREE.Group) => {
        let box = new THREE.Box3().setFromObject(model);
        const s = targetHeight / Math.max(...box.getSize(new THREE.Vector3()).toArray());
        model.scale.setScalar(s);
        box.setFromObject(model);
        const c = box.getCenter(new THREE.Vector3());
        model.position.set(-c.x, -c.y, -c.z);
        box.setFromObject(model);
        rocketBottomY = box.min.y;
        rocketRadius = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) * 0.25;
        if (rocketModel) rocketGroup.remove(rocketModel);
        rocketModel = model;
        rocketGroup.add(rocketModel);
        addTextToRocket(rocketModel);
        if (!engineParticles) createEngineParticles();
      };

      if (modelCache[path]) {
        setupLoadedModel(modelCache[path].clone());
        return;
      }

      gltfLoader.load(path, (gltf) => {
        modelCache[path] = gltf.scene.clone();
        setupLoadedModel(gltf.scene);
      });
    };

    // ─── TEXT ON ROCKET BODY ───
    // Flat plane label that orbits around the rocket — crisp, readable, neon
    const textOrbitGroup = new THREE.Group();
    rocketGroup.add(textOrbitGroup);
    let textPlane: THREE.Mesh | null = null;
    let textPlaneRadius = 0.5;

    const createTextPlane = () => {
      const c = document.createElement('canvas');
      c.width = 1024;
      c.height = 512;
      const ctx = c.getContext('2d')!;
      ctx.clearRect(0, 0, 1024, 512);
      ctx.textAlign = 'center';

      // SPACEX — neon glow (multiple passes)
      ctx.font = 'bold 90px Orbitron, sans-serif';
      // Outer glow
      ctx.shadowColor = '#00ccff';
      ctx.shadowBlur = 40;
      ctx.fillStyle = '#00aaff';
      ctx.fillText('SPACEX', 512, 110);
      ctx.fillText('SPACEX', 512, 110);
      // Mid
      ctx.shadowBlur = 15;
      ctx.fillStyle = '#66eeff';
      ctx.fillText('SPACEX', 512, 110);
      // Core white
      ctx.shadowBlur = 4;
      ctx.shadowColor = '#ffffff';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('SPACEX', 512, 110);

      // Line
      ctx.shadowColor = '#00ccff';
      ctx.shadowBlur = 20;
      ctx.strokeStyle = '#00ddff';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(100, 145); ctx.lineTo(924, 145); ctx.stroke();
      ctx.shadowBlur = 4; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(100, 145); ctx.lineTo(924, 145); ctx.stroke();

      // Name
      ctx.font = 'bold 60px Orbitron, sans-serif';
      ctx.shadowColor = '#00aaff'; ctx.shadowBlur = 35;
      ctx.fillStyle = '#00bbff';
      ctx.fillText('Soroush Salari', 512, 260);
      ctx.fillText('Soroush Salari', 512, 260);
      ctx.shadowBlur = 12; ctx.fillStyle = '#88eeff';
      ctx.fillText('Soroush Salari', 512, 260);
      ctx.shadowBlur = 3; ctx.shadowColor = '#fff'; ctx.fillStyle = '#ffffff';
      ctx.fillText('Soroush Salari', 512, 260);

      // ID
      ctx.font = 'bold 50px Roboto Mono, monospace';
      ctx.shadowColor = '#00aaff'; ctx.shadowBlur = 30;
      ctx.fillStyle = '#00bbff';
      ctx.fillText('101537771', 512, 360);
      ctx.fillText('101537771', 512, 360);
      ctx.shadowBlur = 10; ctx.fillStyle = '#88eeff';
      ctx.fillText('101537771', 512, 360);
      ctx.shadowBlur = 2; ctx.shadowColor = '#fff'; ctx.fillStyle = '#ffffff';
      ctx.fillText('101537771', 512, 360);

      // Bottom line
      ctx.shadowColor = '#00ccff'; ctx.shadowBlur = 20;
      ctx.strokeStyle = '#00ddff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(150, 400); ctx.lineTo(874, 400); ctx.stroke();
      ctx.shadowBlur = 4; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(150, 400); ctx.lineTo(874, 400); ctx.stroke();

      const tex = new THREE.CanvasTexture(c);
      tex.needsUpdate = true;

      return new THREE.ShaderMaterial({
        uniforms: { uTex: { value: tex }, uTime: { value: 0 } },
        vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `
          uniform sampler2D uTex;
          uniform float uTime;
          varying vec2 vUv;
          void main() {
            vec4 t = texture2D(uTex, vUv);
            if (t.a < 0.03) discard;
            float pulse = 0.88 + 0.12 * sin(uTime * 2.0 + vUv.x * 8.0);
            float flicker = 0.98 + 0.02 * sin(uTime * 12.0);
            vec3 col = t.rgb * pulse * flicker;
            gl_FragColor = vec4(col, t.a);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
    };

    const textMat = createTextPlane();

    let rocketTopY = 3; // will be set from bounding box

    const addTextToRocket = (model: THREE.Group) => {
      if (textPlane) textOrbitGroup.remove(textPlane);
      if (!model) return;

      const box = new THREE.Box3().setFromObject(model);
      const height = box.max.y - box.min.y;
      const width = Math.max(box.max.x - box.min.x, box.max.z - box.min.z);

      const planeW = width * 2.5;
      const planeH = height * 0.3;
      const geo = new THREE.PlaneGeometry(planeW, planeH);

      textPlane = new THREE.Mesh(geo, textMat);
      // Position ABOVE the rocket tip
      rocketTopY = box.max.y + planeH * 0.6;
      textPlane.position.set(0, 0, 0);
      textOrbitGroup.position.y = rocketTopY;
      textOrbitGroup.add(textPlane);
    };

    // ─── CINEMATIC CAMERA SEQUENCE ───
    // Phases: 0=idle, 1=zoom in to text, 2=hold on text, 3=orbit around, 4=zoom back out
    let cinePhase = 0;
    let cineTime = 0;
    let cineDuration = 0;
    let cineStartPos = new THREE.Vector3();
    const normalCamPos = new THREE.Vector3(0, 2, 12);

    const triggerZoom = (zoom: boolean) => {
      if (zoom && cinePhase === 0) {
        cinePhase = 1;
        cineTime = 0;
        cineDuration = 4; // zoom in + pan down (4s)
        cineStartPos.copy(camera.position);
        controls.enabled = false;
        controls.autoRotate = false;
      }
    };

    // Initial load + register callbacks
    loadRocketModel('5e9d0d95eda69973a809d1ec');
    this.loadRocketFn = loadRocketModel;
    this.zoomFn = triggerZoom;

    // ─── ENGINE PARTICLES ───
    let engineParticles: THREE.Points | null = null;
    const particleCount = 800;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleVelocities = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    const particleLifetimes = new Float32Array(particleCount);
    const particleMaxLifetimes = new Float32Array(particleCount);

    const resetParticle = (i: number) => {
      const i3 = i * 3;
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * rocketRadius;
      particlePositions[i3] = Math.cos(angle) * r;
      particlePositions[i3 + 1] = rocketBottomY;
      particlePositions[i3 + 2] = Math.sin(angle) * r;
      particleVelocities[i3] = (Math.random() - 0.5) * 0.03;
      particleVelocities[i3 + 1] = -Math.random() * 0.12 - 0.04;
      particleVelocities[i3 + 2] = (Math.random() - 0.5) * 0.03;
      particleLifetimes[i] = 0;
      particleMaxLifetimes[i] = 0.5 + Math.random() * 1.5;
      const t = Math.random();
      if (t < 0.3) { particleColors[i3] = 1.0; particleColors[i3+1] = 0.95; particleColors[i3+2] = 0.8; }
      else if (t < 0.7) { particleColors[i3] = 1.0; particleColors[i3+1] = 0.5 + Math.random() * 0.3; particleColors[i3+2] = 0.1; }
      else { particleColors[i3] = 0.3; particleColors[i3+1] = 0.5 + Math.random() * 0.4; particleColors[i3+2] = 1.0; }
    };

    const createEngineParticles = () => {
      const geo = new THREE.BufferGeometry();
      for (let i = 0; i < particleCount; i++) { resetParticle(i); particleLifetimes[i] = Math.random() * particleMaxLifetimes[i]; }
      geo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
      engineParticles = new THREE.Points(geo, new THREE.PointsMaterial({
        size: 0.1, vertexColors: true, transparent: true, opacity: 0.9,
        blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
      }));
      rocketGroup.add(engineParticles);
    };

    // ─── ANIMATION LOOP ───
    const clock = new THREE.Clock();
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Sun
      sunMesh.rotation.y += 0.0005;
      sunOverlayMat.uniforms['uTime'].value = t;
      coronaInnerMat.uniforms['uTime'].value = t;
      coronaOuterMat.uniforms['uTime'].value = t;
      godRayMat.uniforms['uTime'].value = t;
      sunGroup.children.forEach((child: any) => {
        if (child.material?.uniforms?.uTime) child.material.uniforms.uTime.value = t;
      });
      godRay.lookAt(camera.position);

      // Earth
      earthMesh.rotation.y += 0.001;
      cloudMesh.rotation.y += 0.0015;

      // Moon orbit
      moonMesh.position.set(-6 + Math.cos(t * 0.2) * 4, 1 + Math.sin(t * 0.3) * 0.5, -8 + Math.sin(t * 0.2) * 4);
      moonMesh.rotation.y += 0.002;

      // Mars
      marsMesh.rotation.y += 0.0008;

      // Rocket — no rotation, just gentle hover
      rocketGroup.position.y = Math.sin(t * 0.5) * 0.3;

      // Text faces camera (billboard) — no orbit
      if (textPlane) textPlane.lookAt(camera.position);
      (textMat as any).uniforms.uTime.value = t;

      // ─── CINEMATIC CAMERA SEQUENCE ───
      // Cinematic camera
      if (cinePhase > 0) {
        cineTime += 0.016;
        const progress = Math.min(cineTime / cineDuration, 1);
        const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic

        const rx = rocketGroup.position.x;
        const ry = rocketGroup.position.y;
        const rz = rocketGroup.position.z;

        const textY = rocketTopY + ry;

        if (cinePhase === 1) {
          // Phase 1: Quick zoom in to text then straight pan down to engines (one smooth move)
          const topY = textY;
          const bottomY = ry + rocketBottomY - 1;
          // First 30% = zoom in, remaining 70% = pan down
          if (progress < 0.3) {
            const zoomEase = 1 - Math.pow(1 - (progress / 0.3), 2);
            const closeUp = new THREE.Vector3(rx, topY, rz + 2.5);
            camera.position.lerpVectors(cineStartPos, closeUp, zoomEase);
            camera.lookAt(rx, topY, rz);
          } else {
            const panProgress = (progress - 0.3) / 0.7;
            const panEase = panProgress; // linear for smooth pan
            const currentY = topY + (bottomY - topY) * panEase;
            camera.position.set(rx, currentY, rz + 2.5);
            camera.lookAt(rx, currentY, rz);
          }
          if (progress >= 1) {
            cinePhase = 2;
            cineTime = 0;
            cineDuration = 0.6; // very fast zoom out
            cineStartPos.copy(camera.position);
          }
        } else if (cinePhase === 2) {
          // Phase 2: Quick zoom back out
          camera.position.lerpVectors(cineStartPos, normalCamPos, ease);
          camera.lookAt(0, 0, 0);
          if (progress >= 1) {
            cinePhase = 0;
            controls.enabled = true;
            controls.autoRotate = true;
          }
        }
      }

      // Engine particles
      if (engineParticles) {
        const positions = engineParticles.geometry.attributes['position'].array as Float32Array;
        for (let i = 0; i < particleCount; i++) {
          const i3 = i * 3;
          particleLifetimes[i] += 0.016;
          if (particleLifetimes[i] >= particleMaxLifetimes[i]) { resetParticle(i); continue; }
          positions[i3] += particleVelocities[i3];
          positions[i3 + 1] += particleVelocities[i3 + 1];
          positions[i3 + 2] += particleVelocities[i3 + 2];
          particleVelocities[i3] *= 1.01;
          particleVelocities[i3 + 2] *= 1.01;
        }
        engineParticles.geometry.attributes['position'].needsUpdate = true;
        pointLight.position.set(rocketGroup.position.x, rocketGroup.position.y + rocketBottomY - 1, rocketGroup.position.z);
        pointLight.intensity = 1.5 + Math.sin(t * 10) * 0.5;
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // ─── RESIZE ───
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }
}
