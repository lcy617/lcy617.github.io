/**
 * Lithos · 按页面语言切换的 i18n helper
 * ------------------------------------------------------------
 * 覆盖 Hexo 默认的 __() helper，让它根据当前 page.lang 返回对应语言文案。
 * 直接读取主题 languages/*.yml，不依赖 Hexo 内部 i18n 机制。
 *
 * 这样所有模板里现有的 __('nav.about') 调用会自动跟随页面语言，零改动。
 */

"use strict";

const fs = require("fs");
const path = require("path");

const langsDir = path.join(__dirname, "..", "themes", "lithos", "languages");

function loadYaml(file) {
  const p = path.join(langsDir, file);
  if (!fs.existsSync(p)) return {};
  return parseSimpleYaml(fs.readFileSync(p, "utf8"));
}

// 极简 YAML 解析：处理本项目用到的「顶层 key:」+「  subkey: value」两层结构。
function parseSimpleYaml(raw) {
  const result = {};
  let currentTop = null;
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const topMatch = line.match(/^([A-Za-z0-9_]+):\s*$/);
    if (topMatch) {
      currentTop = topMatch[1];
      result[currentTop] = {};
      continue;
    }
    const subMatch = line.match(/^\s+([A-Za-z0-9_]+):\s*(.*)$/);
    if (subMatch && currentTop) {
      let val = subMatch[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      result[currentTop][subMatch[1]] = val;
    }
  }
  return result;
}

const zhDict = loadYaml("zh.yml");
const enDict = loadYaml("en.yml");

function lookup(dict, key) {
  const parts = key.split(".");
  let val = dict;
  for (const p of parts) {
    if (val == null || typeof val !== "object") return undefined;
    val = val[p];
  }
  return val;
}

// 覆盖 __ helper：按 page.lang 选字典
hexo.extend.helper.register("__", function (key) {
  const lang = (this.page && this.page.lang) || "zh";
  const dict = lang === "en" ? enDict : zhDict;
  const val = lookup(dict, key);
  return val == null ? key : val;
});

// 额外暴露 t() 作为别名，便于显式使用
hexo.extend.helper.register("t", function (key) {
  return hexo.extend.helper.get("__").call(this, key);
});
