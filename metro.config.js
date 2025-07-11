// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");

module.exports = (async () => {
  const config = await getDefaultConfig(__dirname);

  // adiciona .mjs para que o Metro entenda os módulos ESM
  config.resolver.sourceExts.push("mjs");

  return config;
})();
