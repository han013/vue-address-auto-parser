<template>
  <main class="page">
    <h1>地址识别组件调试页</h1>
    <p class="tips">
      输入详细地址、省市区、或口岸名称（如“吉隆口岸”），下面会实时展示识别结果。
    </p>

    <AddressAutoParser
      v-model="address"
      :landmarks="extraLandmarks"
      @parsed="onParsed"
    />

    <section class="debug-panel">
      <h2>调试输出</h2>
      <pre>{{ prettyResult }}</pre>
    </section>

    <section class="debug-panel">
      <h2>默认地区数据包信息</h2>
      <pre>{{ prettyMeta }}</pre>
    </section>

    <section class="quick-tests">
      <h2>一键测试</h2>
      <div class="btns">
        <button v-for="item in samples" :key="item" @click="address = item">
          {{ item }}
        </button>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, ref } from "vue";
import { AddressAutoParser, getRegionBaseData } from "./index";

const address = ref("");
const lastParsed = ref({});

const extraLandmarks = [
  {
    name: "霍尔果斯口岸",
    aliases: ["霍尔果斯"],
    province: "新疆维吾尔自治区",
    city: "伊犁哈萨克自治州",
    district: "霍尔果斯市",
    type: "口岸",
  },
];

const samples = [
  "西藏自治区日喀则市吉隆县吉隆口岸",
  "吉隆口岸",
  "广东深圳南山科技园",
  "上海浦东",
  "霍尔果斯口岸",
];

function onParsed(result) {
  lastParsed.value = result;
}

const prettyResult = computed(() => JSON.stringify(lastParsed.value, null, 2));
const prettyMeta = computed(() => JSON.stringify(getRegionBaseData().meta, null, 2));
</script>

<style scoped>
.page {
  max-width: 900px;
  margin: 32px auto;
  padding: 0 16px;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC",
    "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
}

h1 {
  margin: 0 0 8px;
  font-size: 24px;
}

.tips {
  margin: 0 0 16px;
  color: #666;
}

.debug-panel,
.quick-tests {
  margin-top: 16px;
  padding: 12px;
  border: 1px solid #ececec;
  border-radius: 8px;
  background: #fafafa;
}

h2 {
  margin: 0 0 10px;
  font-size: 16px;
}

pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

.btns {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

button {
  padding: 6px 10px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
}

button:hover {
  border-color: #409eff;
  color: #409eff;
}
</style>
