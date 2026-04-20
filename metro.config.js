const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push("wasm");
config.resolver.sourceExts.push("mjs");

// Fix: scheduler package exports compatibility with Metro bundler
// React 19 uses package exports that Metro can't always resolve correctly
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "./cjs/scheduler.native.development.js") {
    return {
      filePath: path.resolve(
        __dirname,
        "node_modules/scheduler/cjs/scheduler.native.development.js"
      ),
      type: "sourceFile",
    };
  }
  if (moduleName === "./cjs/scheduler.native.production.js") {
    return {
      filePath: path.resolve(
        __dirname,
        "node_modules/scheduler/cjs/scheduler.native.production.js"
      ),
      type: "sourceFile",
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
