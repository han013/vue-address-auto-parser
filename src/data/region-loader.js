import pcd from "./region/pcd.json";
import landmarks from "./region/landmarks.json";
import townshipIndex from "./region/township-index.json";
import meta from "./region/meta.json";

const townshipModules = import.meta.glob("./region/townships/*.json");
const townshipCache = new Map();

const provinceCodeByName = {};
pcd.forEach((p) => {
  provinceCodeByName[p.name] = p.code;
  if (p.name.endsWith("省")) provinceCodeByName[p.name.slice(0, -1)] = p.code;
  if (p.name.endsWith("市")) provinceCodeByName[p.name.slice(0, -1)] = p.code;
  if (p.name === "内蒙古自治区") provinceCodeByName["内蒙古"] = p.code;
  if (p.name === "新疆维吾尔自治区") provinceCodeByName["新疆"] = p.code;
  if (p.name === "广西壮族自治区") provinceCodeByName["广西"] = p.code;
  if (p.name === "宁夏回族自治区") provinceCodeByName["宁夏"] = p.code;
  if (p.name === "西藏自治区") provinceCodeByName["西藏"] = p.code;
});

export function getRegionBaseData() {
  return {
    pcd,
    landmarks,
    townshipIndex,
    meta,
    provinceCodeByName,
  };
}

export async function loadTownshipsByProvinceCode(provinceCode) {
  if (!provinceCode) return [];
  if (townshipCache.has(provinceCode)) return townshipCache.get(provinceCode);
  const key = `./region/townships/${provinceCode}.json`;
  const loader = townshipModules[key];
  if (!loader) return [];
  const mod = await loader();
  const data = mod.default || [];
  townshipCache.set(provinceCode, data);
  return data;
}
