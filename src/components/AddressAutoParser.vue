<template>
  <div class="address-parser">
    <label class="title">{{ label }}</label>
    <textarea
      v-model="inputValue"
      class="input"
      :placeholder="placeholder"
      rows="4"
      @input="handleParse"
    />

    <div class="result">
      <div><strong>省：</strong>{{ parsed.province || "-" }}</div>
      <div><strong>市：</strong>{{ parsed.city || "-" }}</div>
      <div><strong>区/县：</strong>{{ parsed.district || "-" }}</div>
      <div><strong>乡镇/街道：</strong>{{ parsed.township || "-" }}</div>
      <div><strong>标志地区：</strong>{{ parsed.landmark || "-" }}</div>
      <div><strong>置信度：</strong>{{ parsed.confidence }}</div>
    </div>
  </div>
</template>

<script>
import { parseCnAddressAsync } from "../utils/cn-address-parser";

export default {
  name: "AddressAutoParser",
  props: {
    modelValue: {
      type: String,
      default: "",
    },
    label: {
      type: String,
      default: "地址输入",
    },
    placeholder: {
      type: String,
      default: "请输入详细地址/省市区/口岸名称，例如：西藏吉隆口岸",
    },
    // 全国行政区树：[{name, aliases, cities:[{name, aliases, districts:[{name, aliases}]}]}]
    divisionTree: {
      type: Array,
      default: () => [],
    },
    // 可扩展标志地区，如口岸、机场、园区等
    landmarks: {
      type: Array,
      default: () => [],
    },
  },
  emits: ["update:modelValue", "parsed"],
  data() {
    return {
      inputValue: this.modelValue,
      parsed: {
        raw: "",
        normalized: "",
        province: "",
        city: "",
        district: "",
        township: "",
        landmark: "",
        landmarkType: "",
        confidence: 0,
      },
      parseToken: 0,
    };
  },
  watch: {
    modelValue(val) {
      if (val !== this.inputValue) {
        this.inputValue = val || "";
        this.handleParse();
      }
    },
    divisionTree: {
      handler() {
        this.handleParse();
      },
      deep: true,
    },
    landmarks: {
      handler() {
        this.handleParse();
      },
      deep: true,
    },
  },
  mounted() {
    this.handleParse();
  },
  methods: {
    async handleParse() {
      const token = ++this.parseToken;
      const output = await parseCnAddressAsync(this.inputValue, {
        divisionTree: this.divisionTree,
        landmarks: this.landmarks,
      });
      if (token !== this.parseToken) return;
      this.parsed = output;
      this.$emit("update:modelValue", this.inputValue);
      this.$emit("parsed", output);
    },
  },
};
</script>

<style scoped>
.address-parser {
  display: grid;
  gap: 12px;
}

.title {
  font-size: 14px;
  font-weight: 600;
}

.input {
  width: 100%;
  min-height: 96px;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.5;
  outline: none;
}

.input:focus {
  border-color: #409eff;
}

.result {
  display: grid;
  gap: 6px;
  padding: 10px 12px;
  background: #fafafa;
  border: 1px solid #eee;
  border-radius: 8px;
  font-size: 13px;
}
</style>
