# 砚境空间 · InkDesk Spatial（1:1 WebXR / Three.js GLB 空间多窗口仿真端）

本目录为原生 Android Kotlin Compose 工程 `../inkdesk-spatial/` 的 1:1 浏览器交互仿真端（MIT License），用于在任意 Mac / Windows / Linux 浏览器中实时体验 VisionOS 浅灰钛金磨砂玻璃 × 京都桧木三窗口空间书房、4 套双端共享二进制 `.glb` 3D 资产拆解与剖切、`RoomEnvironment` PMREM 金属反射光照、无缝 PBR 材质、宣德炉实时香烟粒子及 WebAudio 3D HRTF 四路空间音频。

## 核心资产与特性

- **共享二进制 `.glb` 3D 资产**（`public/models/`，与 Android `app/src/main/assets/models/` 字节一致）：`yongle_dougong.glb`（658 KB）、`ming_armillary.glb`（2.3 MB）、`xuande_censer.glb`（911 KB）、`origami_pagoda.glb`（371 KB），由 `scripts/build_glb_assets.mjs` 通过 Three.js `GLTFExporter` 导出。
- **3 张 1024×1024 无缝 PBR 贴图**（`public/textures/`）：`hinoki_wood.jpg`（京都桧木）、`patina_bronze.jpg`（明代铸铜包浆）、`alabaster_stone.jpg`（汉白玉石材），绑定 `map + bumpMap + roughnessMap`。
- **机械质量门禁**：TypeScript 严格校验、Vitest 6 项单测全绿、Vite 生产构建、`sloplint` 0 FAIL、Playwright 无头真渲染 0 控制台报错。

## 快速运行

```bash
npm install
npm run dev       # 启动本地交互仿真端 (http://127.0.0.1:5173)
npm test          # 运行 6 项空间布局 / 拆解 / HRTF 音频 / 研学报告 Vitest 单测
npm run build     # TypeScript 严格校验 + Vite 生产构建
node scripts/build_glb_assets.mjs  # 重新导出并同步 4 套双端共享 .glb 资产
```

## 与原生 Kotlin 工程 1:1 数学对齐模块

| WebXR 仿真端 (`src/engine/` & `src/three/`) | 原生 PICO Spatial 工程 (`com.elidot.inkdesk.spatial`) | 核心能力 |
| :--- | :--- | :--- |
| `spatialLayout.ts` | `SpatialPanelLayoutEngine.kt` | 三窗弧形舒适区（1.15m–2.40m）防重叠排布 |
| `explodedModel.ts` + `loadArtifactGlb.ts` | `ExplodedModelController.kt` | 共享 `.glb` 节点拆解插值、实时剖面与毫米卡尺测距 |
| `spatialAudioMath.ts` + `webSpatialAudio.ts` | `SpatialAudioEngine.kt` + `PicoSpatialAudioBridge.kt` | 4 路声源 HRTF 方位角/仰角/反距离衰减双耳渲染 |
| `studyReport.ts` | `SpatialSessionStore.kt` | 跨三窗统一状态与 Markdown 研学报告导出 |
