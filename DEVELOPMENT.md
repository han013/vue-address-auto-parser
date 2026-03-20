# DEVELOPMENT

面向维护者的开发说明，包含调试、数据重建、打包与发布流程。

## 环境准备

```bash
npm i
```

## 本地调试

```bash
npm run dev
```

启动后访问终端提示地址（默认 `http://localhost:5173`）。

调试入口：

- `src/App.vue`：示例页面
- `src/components/AddressAutoParser.vue`：组件实现
- `src/utils/cn-address-parser.js`：识别主逻辑

## 数据结构说明

运行时使用 `src/data/region/` 下的 JSON：

- `pcd.json`：省市区树
- `township-index.json`：乡镇倒排索引
- `townships/*.json`：按省分片乡镇
- `landmarks.json`：口岸/标志地区
- `meta.json`：数据元信息

## 重建地区数据

默认运行不依赖 sqlite。只有需要更新地区库时才执行：

1. 将原始库文件放到：`data/raw/data.sqlite`
2. 执行：

```bash
npm run build:data
```

3. 生成完成后，可删除本地 sqlite（仓库已通过 `.gitignore` 忽略）

## 打包

```bash
npm run build
```

产物目录：`dist/`

## 本地发布包验证

```bash
npm pack
```

生成文件示例：`vue-address-auto-parser-1.0.0.tgz`

## 发布到 npm

```bash
npm login
npm publish
```

如发布失败，请先检查：

- `npm whoami` 是否已登录
- 包名是否可用
- 是否有对应 scope 权限

## Git 发布建议

```bash
git add .
git commit -m "release: v1.0.0"
git tag -a v1.0.0 -m "v1.0.0"
git push -u origin main
git push origin v1.0.0
```
