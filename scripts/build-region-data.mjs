import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import curatedPorts from "../src/data/ports-curated.js";

const root = resolve(process.cwd());
const dbPath = resolve(root, "data/raw/data.sqlite");
const outDir = resolve(root, "src/data/region");
const townshipDir = resolve(outDir, "townships");

function query(sql) {
  const command = `sqlite3 -json "${dbPath}" "${sql}"`;
  const raw = execSync(command, { encoding: "utf8", maxBuffer: 1024 * 1024 * 256 });
  return JSON.parse(raw || "[]");
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

mkdirSync(outDir, { recursive: true });
mkdirSync(townshipDir, { recursive: true });

const provinces = query("select code,name from province order by code;");
const cities = query("select code,name,provinceCode from city order by code;");
const areas = query("select code,name,cityCode from area order by code;");
const streets = query(
  `
  select
    s.code as code,
    s.name as name,
    s.provinceCode as provinceCode,
    p.name as province,
    c.name as city,
    a.name as district
  from street s
  left join province p on p.code = s.provinceCode
  left join city c on c.code = s.cityCode
  left join area a on a.code = s.areaCode
  where s.name is not null and s.name != ''
  order by s.code;
`
);

const portRows = query(
  `
  select
    s.code as code,
    s.name as name,
    p.name as province,
    c.name as city,
    a.name as district
  from street s
  left join province p on p.code = s.provinceCode
  left join city c on c.code = s.cityCode
  left join area a on a.code = s.areaCode
  where s.name like '%口岸'
`
);

const cityMap = new Map();
for (const c of cities) {
  if (!cityMap.has(c.provinceCode)) cityMap.set(c.provinceCode, []);
  cityMap.get(c.provinceCode).push({
    code: c.code,
    name: c.name,
    aliases: [],
    districts: [],
  });
}
const cityByCode = new Map();
for (const list of cityMap.values()) list.forEach((c) => cityByCode.set(c.code, c));
for (const a of areas) {
  const city = cityByCode.get(a.cityCode);
  if (!city) continue;
  city.districts.push({ code: a.code, name: a.name, aliases: [] });
}
const pcd = provinces.map((p) => ({
  code: p.code,
  name: p.name,
  aliases: [],
  cities: cityMap.get(p.code) || [],
}));

const townshipByProvince = new Map();
const townshipIndex = {};
for (const s of streets) {
  const item = {
    code: s.code,
    name: s.name,
    aliases: [],
    province: s.province || "",
    city: s.city || "",
    district: s.district || "",
  };
  if (!townshipByProvince.has(s.provinceCode)) townshipByProvince.set(s.provinceCode, []);
  townshipByProvince.get(s.provinceCode).push(item);
  if (!townshipIndex[s.name]) townshipIndex[s.name] = [];
  townshipIndex[s.name].push({ provinceCode: s.provinceCode, code: s.code });
}

for (const [provinceCode, rows] of townshipByProvince.entries()) {
  writeJson(resolve(townshipDir, `${provinceCode}.json`), rows);
}

const autoPorts = portRows.map((r) => ({
  name: r.name,
  aliases: [r.name.replace(/口岸$/, "")].filter(Boolean),
  province: r.province || "",
  city: r.city || "",
  district: r.district || "",
  type: "口岸",
}));
const landmarks = Array.from(new Map([...curatedPorts, ...autoPorts].map((x) => [x.name, x])).values());

writeJson(resolve(outDir, "pcd.json"), pcd);
writeJson(resolve(outDir, "township-index.json"), townshipIndex);
writeJson(resolve(outDir, "landmarks.json"), landmarks);
writeJson(resolve(outDir, "meta.json"), {
  source: "data/raw/data.sqlite",
  provinces: provinces.length,
  cities: cities.length,
  districts: areas.length,
  townships: streets.length,
  landmarks: landmarks.length,
  generatedAt: new Date().toISOString(),
});

console.log("Generated region data:");
console.log(`- pcd: ${pcd.length} provinces`);
console.log(`- townships: ${streets.length}`);
console.log(`- landmarks: ${landmarks.length}`);
