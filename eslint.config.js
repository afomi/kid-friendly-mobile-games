const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  { ignores: ["dist/*", "android/*", "ios/*"] },
  {
    // Legacy Animated/PanResponder screens predate React Compiler. Keep the
    // normal Hooks checks; defer compiler migration to a separate change.
    files: ["src/app/alchemy.tsx", "src/app/pairs.tsx", "src/app/lights.tsx", "src/app/mines.tsx", "src/app/math.tsx", "src/ui/kit.tsx"],
    rules: {
      "react-hooks/refs": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);
