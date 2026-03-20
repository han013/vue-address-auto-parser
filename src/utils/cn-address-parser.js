import { getRegionBaseData, loadTownshipsByProvinceCode } from "../data/region-loader.js";

const PROVINCE_SUFFIX = ["省", "市", "自治区", "特别行政区"];
const CITY_SUFFIX = ["市", "地区", "自治州", "盟"];
const DISTRICT_SUFFIX = ["区", "县", "旗", "自治县", "自治旗", "市"];
const TOWNSHIP_SUFFIX = ["街道", "镇", "乡", "民族乡", "苏木", "街道办事处", "地区"];
const GENERIC_CITY_NAMES = new Set(["市辖区", "县", "城区", "矿区", "郊区"]);
const GENERIC_TOWNSHIP_NAMES = new Set(["街道", "镇", "乡", "地区"]);

function normalizeText(text) {
  return (text || "")
    .toString()
    .trim()
    .replace(/\s+/g, "")
    .replace(/[，,。；;：:、\-]/g, "");
}

function dropSuffix(name, suffixList) {
  let result = name || "";
  suffixList.forEach((suffix) => {
    if (result.endsWith(suffix)) result = result.slice(0, -suffix.length);
  });
  return result;
}

function toAliasSet(name, aliases = [], suffixList = []) {
  const set = new Set([name, ...aliases].filter(Boolean));
  Array.from(set).forEach((item) => {
    const short = dropSuffix(item, suffixList);
    if (short) set.add(short);
  });
  return Array.from(set).sort((a, b) => b.length - a.length);
}

function hitAny(text, words = []) {
  // 先走全词，再走包含，降低误判
  return words.find((word) => word && text === word) || words.find((word) => word && text.includes(word)) || "";
}

function sanitizeAliases(words = [], minLen = 2, blacklist = new Set()) {
  return words.filter((w) => w && w.length >= minLen && !blacklist.has(w));
}

function buildProvinceAliases(p) {
  const aliases = [...(p.aliases || [])];
  if (p.name === "北京市" || p.name === "上海市" || p.name === "天津市" || p.name === "重庆市") {
    aliases.push(dropSuffix(p.name, ["市"]));
  }
  if (p.name === "内蒙古自治区") aliases.push("内蒙古");
  if (p.name === "新疆维吾尔自治区") aliases.push("新疆");
  if (p.name === "广西壮族自治区") aliases.push("广西");
  if (p.name === "宁夏回族自治区") aliases.push("宁夏");
  if (p.name === "西藏自治区") aliases.push("西藏");
  if (p.name === "香港特别行政区") aliases.push("香港");
  if (p.name === "澳门特别行政区") aliases.push("澳门");
  return toAliasSet(p.name, aliases, PROVINCE_SUFFIX);
}

function buildCityAliases(c) {
  const aliases = toAliasSet(c.name, c.aliases || [], CITY_SUFFIX);
  return sanitizeAliases(aliases, 2, GENERIC_CITY_NAMES);
}

function buildDistrictAliases(d) {
  const aliases = toAliasSet(d.name, d.aliases || [], DISTRICT_SUFFIX);
  return sanitizeAliases(aliases, 2);
}

function buildTownshipAliases(t) {
  const aliases = toAliasSet(t.name, t.aliases || [], TOWNSHIP_SUFFIX);
  return sanitizeAliases(aliases, 2, GENERIC_TOWNSHIP_NAMES);
}

function buildTownshipSearchEntries(townships = []) {
  return townships.map((t) => ({
    ...t,
    _aliases: buildTownshipAliases(t),
  }));
}

function matchTownship(text, entries, region = {}) {
  if (!entries.length) return null;
  const hasProvince = Boolean(region.province);
  const hasCity = Boolean(region.city);
  const hasDistrict = Boolean(region.district);

  // 已有上级行政区时，先做强一致性过滤，避免“山东 + 河北乡镇”这类跨省误配
  let scoped = entries;
  if (hasProvince) scoped = scoped.filter((t) => !t.province || t.province === region.province);
  if (hasCity) scoped = scoped.filter((t) => !t.city || t.city === region.city);
  if (hasDistrict) scoped = scoped.filter((t) => !t.district || t.district === region.district);

  const strictRequired = hasProvince || hasCity || hasDistrict;
  if (strictRequired && !scoped.length) return null;

  const base = scoped.length ? scoped : entries;
  const preferDistrict = base.filter(
    (t) =>
      region.district &&
      t.district === region.district &&
      (!region.city || !t.city || t.city === region.city) &&
      (!region.province || !t.province || t.province === region.province)
  );
  const preferCity = base.filter(
    (t) => region.city && t.city === region.city && (!region.province || !t.province || t.province === region.province)
  );
  const buckets = [preferDistrict, preferCity, base];
  for (const bucket of buckets) {
    if (!bucket.length) continue;
    for (const item of bucket) {
      const exact = item._aliases.find((a) => a === text);
      if (exact) return item;
    }
    let best = null;
    let bestLen = 0;
    for (const item of bucket) {
      const include = item._aliases.find((a) => text.includes(a));
      if (include && include.length > bestLen) {
        best = item;
        bestLen = include.length;
      }
    }
    if (best) return best;
  }
  return null;
}

export function parseCnAddress(rawAddress, divisionTree, options = {}) {
  const text = normalizeText(rawAddress);
  const { landmarks: defaultLandmarks, pcd } = getRegionBaseData();
  const merged = [...defaultLandmarks, ...(options.landmarks || [])];
  const landmarks = Array.from(new Map(merged.map((x) => [x.name, x])).values());
  const result = {
    raw: rawAddress || "",
    normalized: text,
    province: "",
    city: "",
    district: "",
    township: "",
    landmark: "",
    landmarkType: "",
    confidence: 0,
  };

  if (!text) return result;

  // 1) 优先识别口岸/标志地区
  for (const mark of landmarks) {
    const markAliases = toAliasSet(mark.name, mark.aliases || []);
    const matched = hitAny(text, markAliases);
    if (matched) {
      result.province = mark.province || "";
      result.city = mark.city || "";
      result.district = mark.district || "";
      result.landmark = mark.name || "";
      result.landmarkType = mark.type || "标志地区";
      result.confidence = 0.98;
      return result;
    }
  }

  // 2) 省市区三级匹配（依赖传入全国行政区树）
  const provinces = Array.isArray(divisionTree) && divisionTree.length ? divisionTree : pcd;
  if (!provinces.length) return result;

  let matchedProvince = null;
  let matchedCity = null;
  let matchedDistrict = null;

  for (const p of provinces) {
    const pAlias = buildProvinceAliases(p);
    if (hitAny(text, pAlias)) {
      matchedProvince = p;
      break;
    }
  }

  if (matchedProvince) {
    result.province = matchedProvince.name;
    const cities = matchedProvince.cities || [];
    for (const c of cities) {
      const cAlias = buildCityAliases(c);
      if (hitAny(text, cAlias)) {
        matchedCity = c;
        break;
      }
    }

    if (matchedCity) {
      result.city = matchedCity.name;
      const districts = matchedCity.districts || [];
      for (const d of districts) {
        const dAlias = buildDistrictAliases(d);
        if (hitAny(text, dAlias)) {
          matchedDistrict = d;
          break;
        }
      }
    } else {
      // 省内未命中城市，尝试直接命中区县
      for (const c of cities) {
        for (const d of c.districts || []) {
          if (hitAny(text, buildDistrictAliases(d))) {
            matchedCity = c;
            matchedDistrict = d;
            break;
          }
        }
        if (matchedDistrict) break;
      }
      if (matchedCity) result.city = matchedCity.name;
    }
  } else {
    // 无省份命中时，优先全局命中区县（如“故城县”）
    for (const p of provinces) {
      for (const c of p.cities || []) {
        for (const d of c.districts || []) {
          if (hitAny(text, buildDistrictAliases(d))) {
            matchedProvince = p;
            matchedCity = c;
            matchedDistrict = d;
            break;
          }
        }
        if (matchedDistrict) break;
      }
      if (matchedDistrict) break;
    }
    if (matchedProvince) result.province = matchedProvince.name;
    if (matchedCity) result.city = matchedCity.name;
    if (matchedDistrict) result.district = matchedDistrict.name;

    if (matchedDistrict) {
      // 命中区县后继续尝试识别乡镇，提高完整度
    }

    // 无省份命中时，尝试全局命中市
    for (const p of provinces) {
      for (const c of p.cities || []) {
        if (hitAny(text, buildCityAliases(c))) {
          matchedProvince = p;
          matchedCity = c;
          break;
        }
      }
      if (matchedCity) break;
    }
    if (matchedProvince) result.province = matchedProvince.name;
    if (matchedCity) result.city = matchedCity.name;
  }

  if (!matchedDistrict && matchedCity) {
    for (const d of matchedCity.districts || []) {
      if (hitAny(text, buildDistrictAliases(d))) {
        matchedDistrict = d;
        break;
      }
    }
  }

  if (matchedDistrict) result.district = matchedDistrict.name;

  const townshipEntries = buildTownshipSearchEntries([
    ...(options.townships || []),
  ]);
  const matchedTownship = matchTownship(text, townshipEntries, {
    province: result.province,
    city: result.city,
    district: result.district,
  });
  if (matchedTownship) {
    result.township = matchedTownship.name;
    if (!result.province) result.province = matchedTownship.province || "";
    if (!result.city) result.city = matchedTownship.city || "";
    if (!result.district) result.district = matchedTownship.district || "";
  }

  // 粗略置信度
  const score =
    (result.province ? 0.35 : 0) +
    (result.city ? 0.35 : 0) +
    (result.district ? 0.2 : 0) +
    (result.township ? 0.1 : 0);
  result.confidence = Number(score.toFixed(2));

  return result;
}

/**
 * 将省/市/区列表构建为解析需要的树结构
 * 用法示例（可选）:
 * import { provinces, cities, areas } from "china-division";
 * const tree = buildDivisionTree({ provinces, cities, areas });
 */
export function buildDivisionTree({ provinces = [], cities = [], areas = [] }) {
  const cityMap = new Map();
  const areaMap = new Map();

  areas.forEach((a) => {
    const parentCode = String(a.code).slice(0, 4);
    if (!areaMap.has(parentCode)) areaMap.set(parentCode, []);
    areaMap.get(parentCode).push({
      code: String(a.code),
      name: a.name,
      aliases: [],
    });
  });

  cities.forEach((c) => {
    const parentCode = String(c.code).slice(0, 2);
    const cityCode4 = String(c.code).slice(0, 4);
    if (!cityMap.has(parentCode)) cityMap.set(parentCode, []);
    cityMap.get(parentCode).push({
      code: String(c.code),
      name: c.name,
      aliases: [],
      districts: areaMap.get(cityCode4) || [],
    });
  });

  return provinces.map((p) => ({
    code: String(p.code),
    name: p.name,
    aliases: [],
    cities: cityMap.get(String(p.code).slice(0, 2)) || [],
  }));
}

function inferProvinceCodesFromTownshipIndex(text, townshipIndex) {
  const matched = [];
  for (const [name, rows] of Object.entries(townshipIndex || {})) {
    const short = dropSuffix(name, TOWNSHIP_SUFFIX);
    const hitByFull = name && text.includes(name);
    const hitByShort = short && short.length >= 2 && text.includes(short);
    if (hitByFull || hitByShort) {
      matched.push({ name, rows });
    }
  }
  matched.sort((a, b) => b.name.length - a.name.length);
  const codeSet = new Set();
  matched.slice(0, 8).forEach((m) => {
    (m.rows || []).forEach((r) => codeSet.add(r.provinceCode));
  });
  return Array.from(codeSet);
}

export async function parseCnAddressAsync(rawAddress, options = {}) {
  const text = normalizeText(rawAddress);
  const { pcd, landmarks, townshipIndex, provinceCodeByName } = getRegionBaseData();
  const divisionTree = options.divisionTree?.length ? options.divisionTree : pcd;
  const mergedLandmarks = [...landmarks, ...(options.landmarks || [])];

  let result = parseCnAddress(rawAddress, divisionTree, {
    landmarks: mergedLandmarks,
    townships: options.townships || [],
  });
  if (!text || result.township) return result;

  const provinceCodes = new Set();
  if (result.province && provinceCodeByName[result.province]) {
    provinceCodes.add(provinceCodeByName[result.province]);
  } else {
    inferProvinceCodesFromTownshipIndex(text, townshipIndex)
      .slice(0, 3)
      .forEach((code) => provinceCodes.add(code));
  }

  if (!provinceCodes.size) return result;

  const chunkTownships = [];
  for (const code of provinceCodes) {
    const chunk = await loadTownshipsByProvinceCode(code);
    chunkTownships.push(...chunk);
  }

  const resultWithTownship = parseCnAddress(rawAddress, divisionTree, {
    landmarks: mergedLandmarks,
    townships: [...chunkTownships, ...(options.townships || [])],
  });

  // 若分片结果置信度更高或识别到乡镇，则优先采用
  if (resultWithTownship.township || resultWithTownship.confidence >= result.confidence) {
    result = resultWithTownship;
  }
  return result;
}
