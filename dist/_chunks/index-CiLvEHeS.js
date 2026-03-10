"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const jsxRuntime = require("react/jsx-runtime");
const designSystem = require("@strapi/design-system");
const Settings = () => {
  return /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Box, { padding: 8, children: [
    /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "alpha", children: "Strapi Localize Settings" }),
    /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { children: "Settings page is working!" })
  ] });
};
exports.default = Settings;
