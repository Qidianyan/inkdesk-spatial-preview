# 砚境空间 · InkDesk Spatial（1:1 WebXR / Three.js GLB 空间多窗口仿真端 · V6 终版）

本目录为原生 Android Kotlin Compose 工程 `../inkdesk-spatial/` 的 1:1 浏览器交互仿真端（MIT License），用于在任意 Mac / Windows / Linux 浏览器中实时体验 VisionOS 浅灰钛金磨砂玻璃 × 京都桧木三窗口空间书房、4 套双端共享二进制 `.glb` 3D 资产、**3D 榫卯磁吸拼装与京都桧木咬合声学**、**Y/X/Z 三轴建筑剖面实时切片**、**16 枚 3D 空间双向批注钉（含自定义持久化）**、**3 档纯暖建筑影棚光照（5200K / 4400K / 2450K）**、`RoomEnvironment` PMREM 金属反射光照、宣德炉实时香烟粒子及 WebAudio 3D HRTF 四路空间音频。

## 核心资产与机械质量门禁

- **共享二进制 `.glb` 3D 资产**（`public/models/`，与 Android `app/src/main/assets/models/` 字节一致）：`yongle_dougong.glb`（658 KB）、`ming_armillary.glb`（2.39 MB）、`xuande_censer.glb`（911 KB）、`origami_pagoda.glb`（371 KB），由 `scripts/build_glb_assets.mjs` 通过 Three.js `GLTFExporter` 导出。
- **3 张 1024×1024 无缝 PBR 贴图**（`public/textures/`）：`hinoki_wood.jpg`（京都桧木）、`patina_bronze.jpg`（明代铸铜包浆）、`alabaster_stone.jpg`（汉白玉石材），绑定 `map + bumpMap + roughnessMap`。
- **机械质量门禁全绿**：`tsc --noEmit` 0 错、**Vitest 33/33 单测全绿**（榫卯磁吸 14 + 3D 锚点与影棚光 13 + 空间布局/拆解/HRTF/报告 6）、Vite 生产构建、**8 视口 `sloplint --render` `0 FAIL / 0 WARN`**、Metal 无头 Playwright E2E 零控制台报错。

## 快速运行

```bash
npm install
npm run dev       # 启动本地交互仿真端 (http://127.0.0.1:5173)
npm test          # 运行 33 项全量空间领域 Vitest 单测
npm run build     # TypeScript 严格校验 + Vite 生产构建
node scripts/build_glb_assets.mjs  # 重新导出并同步 4 套双端共享 .glb 资产
```

## 与原生 Kotlin 工程 1:1 数学对齐模块

| WebXR 仿真端 (`src/`) | 原生 PICO Spatial 工程 (`com.elidot.inkdesk`) | 核心能力 |
| :--- | :--- | :--- |
| `assembly/mortiseAssembly.ts` | `domain/MortiseAssemblyEngine.kt` | 4 套展品严序 3D 榫卯磁吸（`18cm / 15°` 阈值）与 Y/X/Z 三轴建筑剖面切片 |
| `spatial/calloutAnchors.ts` | `domain/SpatialAnchorEngine.kt` | 16 枚 3D 双向锚点批注钉、自定义持久化/防撞号、焦距钳制与 3 档纯暖影棚光 |
| `engine/spatialLayout.ts` | `spatial/SpatialPanelLayoutEngine.kt` | 三窗弧形舒适区（1.15m–2.40m）防重叠排布与三态布局切换 |
| `engine/explodedModel.ts` + `three/loadArtifactGlb.ts` | `spatial/ExplodedModelController.kt` | 共享 `.glb` 节点拆解插值、实时剖面与毫米卡尺测距 |
| `engine/spatialAudioMath.ts` + `engine/webSpatialAudio.ts` | `spatial/SpatialAudioEngine.kt` + `ui/PicoSpatialAudioBridge.kt` | 4 路声源 HRTF 方位角/仰角/反距离衰减双耳渲染与京都桧木咬合声合成 |
| `engine/studyReport.ts` | `spatial/SpatialSessionStore.kt` | 跨三窗统一状态与含光影/锚点的 Markdown 研学报告导出 |
