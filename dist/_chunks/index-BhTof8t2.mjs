import { jsxs, jsx } from "react/jsx-runtime";
import { Box, Typography } from "@strapi/design-system";
const Settings = () => {
  return /* @__PURE__ */ jsxs(Box, { padding: 8, children: [
    /* @__PURE__ */ jsx(Typography, { variant: "alpha", children: "Strapi Localize Settings" }),
    /* @__PURE__ */ jsx(Typography, { children: "Settings page is working!" })
  ] });
};
export {
  Settings as default
};
