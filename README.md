# vue-address-auto-parser

可打包发布的 Vue3 地址识别组件库，支持：

- 详细地址识别省/市/区
- 支持乡镇/街道识别
- 只输入省市也可识别
- 口岸等标志地区识别（如“吉隆口岸”）
- 内置全量省市区数据（由 `data/raw/data.sqlite` 生成）
- 内置口岸数据包（由 `data/raw/data.sqlite` 自动提取）

## 目录结构

- `src/components/AddressAutoParser.vue`：组件本体
- `src/utils/cn-address-parser.js`：地址解析算法
- `src/index.js`：组件库入口（含 install）
- `vite.config.js`：库模式构建配置
- `data/raw/data.sqlite`：可选原始行政区数据（默认不提交）
- `src/data/region/pcd.json`：省市区数据
- `src/data/region/township-index.json`：乡镇倒排索引
- `src/data/region/townships/*.json`：按省分片乡镇数据
- `src/data/region/landmarks.json`：口岸/标志地区数据
- `src/data/ports-curated.js`：手工维护的常用口岸清单

## 本地打包

```bash
npm i
npm run build:data
npm run build
```

打包后产物在 `dist/` 目录。

## 本地调试（playground）

当前仓库已内置调试页，可直接运行：

```bash
npm run dev
```

然后打开终端输出的本地地址（通常是 `http://localhost:5173`）。

调试入口文件：

- `index.html`
- `src/main.js`
- `src/App.vue`

你可以在 `src/App.vue` 里直接改测试样例、口岸列表来验证解析效果。

## 在业务项目中使用

### 1) 安装组件包

发布到 npm/私服后：

```bash
npm i vue-address-auto-parser
```

### 2) 全局注册（插件方式）

```js
import { createApp } from "vue";
import App from "./App.vue";
import { AddressAutoParserPlugin } from "vue-address-auto-parser";

createApp(App).use(AddressAutoParserPlugin).mount("#app");
```

### 3) 按需引入

```vue
<script setup>
import { ref } from "vue";
import { AddressAutoParser } from "vue-address-auto-parser";

const address = ref("");
</script>

<template>
  <AddressAutoParser
    v-model="address"
    @parsed="(res) => console.log(res)"
  />
</template>
```

### 4) 方法调用（默认导出）

```js
import parseAddress from "vue-address-auto-parser";

const result = await parseAddress("河北故城县房庄镇");
console.log(result);
```

## 行政区数据

默认已经内置全国省市区、口岸和乡镇分片数据，可直接识别。

默认运行不依赖 sqlite 原始文件。只有在你要重建地区数据时，才需要放入 `data/raw/data.sqlite`，然后执行：

```bash
npm run build:data
```

建议把 `data/raw/data.sqlite` 保持为本地文件（已在 `.gitignore` 忽略）。

如果你有自己的省市区字典，也可以覆盖传入 `divisionTree`（格式见组件注释）。
如果你有更完整的口岸名录，也可以通过组件 `landmarks` 参数覆盖或追加；也可直接维护 `src/data/ports-curated.js`。
默认组件会按省按需加载乡镇分片，减少主包体积。
