import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "node:path";

export default defineConfig(({ command }) => {
  // dev: 作为 playground 应用运行；build: 作为组件库构建
  if (command === "serve") {
    return {
      plugins: [vue()],
    };
  }

  return {
    plugins: [vue()],
    build: {
      lib: {
        entry: resolve(__dirname, "src/index.js"),
        name: "VueAddressParser",
        fileName: "vue-address-parser",
        formats: ["es", "umd"],
      },
      rollupOptions: {
        external: ["vue"],
        output: {
          exports: "named",
          globals: {
            vue: "Vue",
          },
        },
      },
    },
  };
});
