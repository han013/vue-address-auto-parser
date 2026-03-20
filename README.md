# vue-address-parser

中国地址智能识别库，支持：

- 省 / 市 / 区县 / 乡镇街道识别
- 口岸等标志地区识别（如“吉隆口岸”）
- 输入简称识别（如“房庄” -> “房庄镇”）
- 分片加载乡镇数据，兼顾准确率与体积

## 安装

```bash
npm i vue-address-parser
```

源码与反馈：[GitHub - han013/vue-address-auto-parser](https://github.com/han013/vue-address-auto-parser)

## 快速使用

### 1) 方法调用（推荐，默认导出）

```js
import parseAddress from "vue-address-parser";

const result = await parseAddress("河北省衡水市故城县房庄镇");
console.log(result);
```

返回示例：

```json
{
  "province": "河北省",
  "city": "衡水市",
  "district": "故城县",
  "township": "房庄镇",
  "landmark": "",
  "confidence": 1
}
```

### 2) 组件方式

```vue
<script setup>
import { ref } from "vue";
import { AddressAutoParser } from "vue-address-parser";

const address = ref("");
</script>

<template>
  <AddressAutoParser v-model="address" @parsed="(res) => console.log(res)" />
</template>
```

### 3) 插件方式（全局注册）

```js
import { createApp } from "vue";
import App from "./App.vue";
import { AddressAutoParserPlugin } from "vue-address-parser";

createApp(App).use(AddressAutoParserPlugin).mount("#app");
```

## API

### 默认导出

- `parseCnAddressAsync(address: string, options?: object): Promise<Result>`

### 命名导出

- `AddressAutoParser`：Vue 组件
- `AddressAutoParserPlugin`：Vue 插件
- `parseCnAddress`：同步解析（不触发分片懒加载）
- `parseCnAddressAsync`：异步解析（推荐）
- `buildDivisionTree`：将自定义行政区数据转换为识别结构
- `getRegionBaseData`：获取内置地区基础数据

### 组件 Props

- `modelValue: string`
- `divisionTree?: Array`（可覆盖内置省市区）
- `landmarks?: Array`（可追加/覆盖标志地区）
- `label?: string`
- `placeholder?: string`

### 组件事件

- `update:modelValue`
- `parsed`（返回完整识别结果）

## 常见问题

- `山东房庄` 为什么不直接匹配乡镇？
  - 当前策略会优先保证省市区镇一致性，避免跨省误匹配。
- 只输入 `房庄` 可以识别吗？
  - 可以，已支持乡镇简称匹配。
- 口岸不全怎么办？
  - 可通过组件 `landmarks` 传入扩展数据。

## 开发与调试

开发者说明已迁移到：`DEVELOPMENT.md`
