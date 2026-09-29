// 首级 LOD / 替身（第九轮 · MOD「lod」）
// 一颗完整首级 = 19~33 个网格、5k~24k 三角形；200 颗就是 ~5000 次 draw call，这是中后期卡顿的根源。
// 远处（≥ NEAR 米）且静止的首级改用「替身」：用正交相机从当前视角把它拍进一张图集的一格，
// 然后全部替身用一个 InstancedMesh 一次画完（1 次 draw call）。视角变化超过阈值时按预算重拍。
// 近处 / 被拿着 / 正在运动的首级始终是完整模型。
(function () {
  const L5 = 5; // 拍照专用图层
  function create(renderer, scene, opts) {
    opts = opts || {};
    const CELL = 112, ATL = 2048, PER = Math.floor(ATL / CELL), NCELL = PER * PER; // 18×18 = 324 格
    const NEAR = opts.near || 4.5, FAR2 = 30 * 30, BUDGET = 3, COS_RESNAP = Math.cos(22 * Math.PI / 180);
    const rt = new THREE.WebGLRenderTarget(ATL, ATL, { depthBuffer: true, stencilBuffer: true, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false });
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 10); cam.layers.set(L5);
    const free = []; for (let i = NCELL - 1; i >= 0; i--) free.push(i);
    // 灯光在第 5 层也要生效（r147 按相机图层收集灯光）
    const lightsOn = () => scene.traverse(o => { if (o.isLight) o.layers.enable(L5); });
    lightsOn();
    // 实例化广告牌
    const MAXI = NCELL;
    const geo = new THREE.InstancedBufferGeometry(); const pg = new THREE.PlaneGeometry(1, 1);
    geo.index = pg.index; geo.setAttribute('position', pg.attributes.position); geo.setAttribute('uv', pg.attributes.uv);
    const aC = new THREE.InstancedBufferAttribute(new Float32Array(MAXI * 4), 4); aC.setUsage(THREE.DynamicDrawUsage); // center.xyz, size
    const aU = new THREE.InstancedBufferAttribute(new Float32Array(MAXI * 2), 2); aU.setUsage(THREE.DynamicDrawUsage); // cell uv origin
    geo.setAttribute('aC', aC); geo.setAttribute('aU', aU); geo.instanceCount = 0;
    const mat = new THREE.ShaderMaterial({
      uniforms: { tA: { value: rt.texture }, uCell: { value: CELL / ATL }, fogColor: { value: new THREE.Color() }, fogNear: { value: 1 }, fogFar: { value: 1000 }, uFog: { value: 0 } },
      vertexShader: `attribute vec4 aC; attribute vec2 aU; varying vec2 vUv; varying float vD; uniform float uCell;
        void main() { vec4 mv = viewMatrix * vec4(aC.xyz, 1.0); mv.xy += position.xy * aC.w; vD = -mv.z; vUv = aU + uv * uCell; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D tA; varying vec2 vUv; varying float vD; uniform vec3 fogColor; uniform float fogNear, fogFar, uFog;
        void main() { vec4 c = texture2D(tA, vUv); if (c.a < 0.45) discard; vec3 col = c.rgb / max(c.a, 1e-3);
          if (uFog > 0.5) col = mix(col, fogColor, smoothstep(fogNear, fogFar, vD));
          gl_FragColor = linearToOutputTexel(vec4(col, 1.0)); }`,
      toneMapped: false
    });
    const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = 0; scene.add(mesh);
    const tmpV = new THREE.Vector3(), tmpD = new THREE.Vector3(), box = new THREE.Box3(), sph = new THREE.Sphere();
    const cc = new THREE.Color();
    let frames = 0;
    function bound(h) {
      // 首级局部包围球（按模型真实几何测一次；首级整体可旋转，所以用球）
      if (h._lodR) return;
      const vis = h.g.visible; h.g.visible = true;
      const q = h.g.quaternion.clone(), p = h.g.position.clone(); h.g.quaternion.identity(); h.g.position.set(0, 0, 0); h.g.updateMatrixWorld(true);
      box.makeEmpty(); h.hb.group.traverse(o => { if (o.isMesh && o.geometry) { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld); box.union(b); } });
      box.getBoundingSphere(sph); h._lodC = sph.center.clone(); const hs = box.getSize(tmpV).multiplyScalar(0.5); h._lodR = Math.min(0.5, Math.max(0.1, Math.max(hs.x, hs.y, hs.z) * 1.15)); // 比外接球紧（清晰度≈翻倍），极端姿态下耳尖可能轻微裁切
      h.g.quaternion.copy(q); h.g.position.copy(p); h.g.updateMatrixWorld(true); h.g.visible = vis;
    }
    function snap(h, camera) {
      bound(h);
      if (h._cell === undefined) { if (!free.length) return false; h._cell = free.pop(); }
      const c = tmpV.copy(h._lodC).applyQuaternion(h.g.quaternion).add(h.g.position);
      tmpD.copy(camera.position).sub(c).normalize();
      const r = h._lodR * 1.04;
      cam.left = -r; cam.right = r; cam.top = r; cam.bottom = -r; cam.near = 0.01; cam.far = 4 * r + 2;
      cam.position.copy(c).addScaledVector(tmpD, 2 * r + 1); cam.up.copy(camera.up); cam.lookAt(c); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
      const was = h.g.visible; h.g.visible = true;
      h.g.traverse(o => o.layers.enable(L5));
      const bg = scene.background, fog = scene.fog, prevRT = renderer.getRenderTarget(), ac = renderer.autoClear;
      renderer.getClearColor(cc); const ca = renderer.getClearAlpha();
      // 不能把 scene.fog 设为 null —— 那会让每个首级材质再编译一份“无雾”着色器（开局卡顿元凶之一）；改为临时把雾推远
      const fn = fog && fog.isFog ? fog.near : 0, ff = fog && fog.isFog ? fog.far : 0, fd = fog && fog.isFogExp2 ? fog.density : 0;
      if (fog && fog.isFog) { fog.near = 1e5; fog.far = 1e5 + 1; } if (fog && fog.isFogExp2) fog.density = 0;
      scene.background = null; mesh.visible = false;
      const x = (h._cell % PER) * CELL, y = Math.floor(h._cell / PER) * CELL;
      rt.viewport.set(x, y, CELL, CELL); rt.scissor.set(x, y, CELL, CELL); rt.scissorTest = true; renderer.setRenderTarget(rt); // 必须先设视口/裁剪再绑定（setRenderTarget 时才拷贝）
      renderer.setClearColor(0x000000, 0); renderer.autoClear = false; renderer.clear(true, true, true);
      renderer.render(scene, cam);
      rt.scissorTest = false; rt.viewport.set(0, 0, ATL, ATL); rt.scissor.set(0, 0, ATL, ATL);
      renderer.setRenderTarget(prevRT); renderer.setClearColor(cc, ca); renderer.autoClear = ac;
      scene.background = bg; if (fog && fog.isFog) { fog.near = fn; fog.far = ff; } if (fog && fog.isFogExp2) fog.density = fd; mesh.visible = true;
      h.g.traverse(o => o.layers.disable(L5));
      h.g.visible = was;
      h._snapDir = tmpD.clone(); h._snapQ = h.g.quaternion.clone(); h._snapP = h.g.position.clone(); h._snapS = h.hb.group.scale.x;
      return true;
    }
    function release(h) { if (h._cell !== undefined) { free.push(h._cell); h._cell = undefined; } h._imp = false; h._snapDir = null; }
    // 每帧：决定谁用替身；返回 {full, imp}
    function update(heads, camera, held) {
      frames++; let n = 0, budget = frames < 90 ? 1 : BUDGET, full = 0; // 开局前 90 帧每帧只拍 1 张，避免卡顿
      const fog = scene.fog;
      if (fog && fog.isFog) { mat.uniforms.uFog.value = 1; mat.uniforms.fogColor.value.copy(fog.color); mat.uniforms.fogNear.value = fog.near; mat.uniforms.fogFar.value = fog.far; } else mat.uniforms.uFog.value = 0;
      for (const h of heads) {
        const dd = camera.position.distanceToSquared(h.g.position);
        const still = h.mount || (h.sleep > 1.0 && h.vel.lengthSq() < 1e-4);
        const want = h !== held && still && !h.squash && !(h.wob > 0) && dd > NEAR * NEAR * (h._imp ? 0.85 : 1) && dd < FAR2;
        if (!want) { if (h._imp) { h._imp = false; } if (dd >= FAR2) { h.g.visible = false; } else { h.g.visible = true; full++; } if (!want && h._cell !== undefined && dd < NEAR * NEAR * 0.5) release(h); continue; }
        // 需要（重）拍？
        let ok = !!h._snapDir;
        if (ok) {
          const c = tmpV.copy(h._lodC).applyQuaternion(h.g.quaternion).add(h.g.position);
          tmpD.copy(camera.position).sub(c).normalize();
          if (tmpD.dot(h._snapDir) < COS_RESNAP || h._snapP.distanceToSquared(h.g.position) > 1e-4 || Math.abs(h._snapQ.dot(h.g.quaternion)) < 0.999) ok = false;
        }
        if (!ok && budget > 0) { if (snap(h, camera)) { ok = true; budget--; } }
        if (!ok && !h._snapDir) { h._imp = false; h.g.visible = true; full++; continue; }
        // 旧快照在预算不足时继续用（轻微视角误差可接受）
        h._imp = true; h.g.visible = false;
        const c = tmpV.copy(h._lodC).applyQuaternion(h.g.quaternion).add(h.g.position);
        const s = h._lodR * 1.04 * 2 * (h.hb.group.scale.x / (h._snapS || h.hb.group.scale.x));
        aC.setXYZW(n, c.x, c.y, c.z, s);
        aU.setXY(n, (h._cell % PER) * CELL / ATL, Math.floor(h._cell / PER) * CELL / ATL);
        n++;
      }
      geo.instanceCount = n; aC.needsUpdate = true; aU.needsUpdate = true;
      return { full, imp: n, free: free.length };
    }
    function disableAll(heads) { for (const h of heads) { release(h); } geo.instanceCount = 0; }
    return { update, release, disableAll, lightsOn, NEAR, rt };
  }
  window.HeadLOD = { create };
})();
