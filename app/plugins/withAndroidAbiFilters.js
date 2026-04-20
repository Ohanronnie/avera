const { withAppBuildGradle } = require("@expo/config-plugins");

const DEFAULT_ABI_FILTERS = ["arm64-v8a"];

function formatAbiFilters(abiFilters) {
  return abiFilters.map((abi) => `"${abi}"`).join(", ");
}

function addAbiFilters(buildGradle, abiFilters) {
  const abiFiltersLine = `abiFilters ${formatAbiFilters(abiFilters)}`;

  if (/abiFilters\s+["']/.test(buildGradle)) {
    return buildGradle.replace(/abiFilters\s+.+/g, abiFiltersLine);
  }

  if (/defaultConfig\s*\{[\s\S]*?ndk\s*\{/.test(buildGradle)) {
    return buildGradle.replace(
      /(defaultConfig\s*\{[\s\S]*?ndk\s*\{)/,
      `$1\n            ${abiFiltersLine}`,
    );
  }

  return buildGradle.replace(
    /(defaultConfig\s*\{)/,
    `$1\n        ndk {\n            ${abiFiltersLine}\n        }`,
  );
}

module.exports = function withAndroidAbiFilters(config, props = {}) {
  const abiFilters = props.abiFilters || DEFAULT_ABI_FILTERS;

  return withAppBuildGradle(config, (config) => {
    config.modResults.contents = addAbiFilters(
      config.modResults.contents,
      abiFilters,
    );
    return config;
  });
};
