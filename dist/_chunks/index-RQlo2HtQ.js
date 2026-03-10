"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const jsxRuntime = require("react/jsx-runtime");
const react = require("react");
const designSystem = require("@strapi/design-system");
const admin = require("@strapi/strapi/admin");
const Settings = () => {
  const { get, put, post } = admin.useFetchClient();
  const { toggleNotification } = admin.useNotification();
  const [settings, setSettings] = react.useState({
    apiKey: "",
    contentTypes: {},
    autoTranslate: false
  });
  const [isLoading, setIsLoading] = react.useState(true);
  const [isSaving, setIsSaving] = react.useState(false);
  const [isTestingConnection, setIsTestingConnection] = react.useState(false);
  const [connectionStatus, setConnectionStatus] = react.useState(null);
  react.useEffect(() => {
    fetchSettings();
  }, []);
  const fetchSettings = async () => {
    try {
      const response = await get("/strapi-localize/settings");
      setSettings(response.data || response || {});
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
    setIsLoading(false);
  };
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await put("/strapi-localize/settings", settings);
      toggleNotification({
        type: "success",
        message: "Settings saved successfully"
      });
    } catch (error) {
      toggleNotification({
        type: "warning",
        message: "Failed to save settings"
      });
    }
    setIsSaving(false);
  };
  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    try {
      const response = await post("/strapi-localize/test-connection");
      const data = response.data || response;
      setConnectionStatus(data.success);
      toggleNotification({
        type: data.success ? "success" : "warning",
        message: data.success ? "Connected to DeepL!" : data.error || "Connection failed"
      });
    } catch (error) {
      setConnectionStatus(false);
      toggleNotification({
        type: "warning",
        message: "Connection test failed"
      });
    }
    setIsTestingConnection(false);
  };
  if (isLoading) {
    return /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { padding: 8, children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { children: "Loading settings..." }) });
  }
  return /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Box, { padding: 8, children: [
    /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "alpha", marginBottom: 4, children: "DeepL Translate Settings" }),
    /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { direction: "column", gap: 6, children: [
      /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Card, { children: [
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.CardHeader, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "beta", children: "API Configuration" }) }),
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.CardBody, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.CardContent, { children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { direction: "column", gap: 4, children: [
          /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Field.Root, { children: [
            /* @__PURE__ */ jsxRuntime.jsx(designSystem.Field.Label, { children: "DeepL API Key" }),
            /* @__PURE__ */ jsxRuntime.jsx(
              designSystem.TextInput,
              {
                type: "password",
                name: "apiKey",
                value: settings.apiKey || "",
                onChange: (e) => setSettings({ ...settings, apiKey: e.target.value })
              }
            ),
            /* @__PURE__ */ jsxRuntime.jsx(designSystem.Field.Hint, { children: "Enter your DeepL API key (Free or Pro)" })
          ] }),
          /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { gap: 2, children: [
            /* @__PURE__ */ jsxRuntime.jsx(
              designSystem.Button,
              {
                onClick: handleTestConnection,
                loading: isTestingConnection,
                disabled: !settings.apiKey,
                variant: "secondary",
                children: "Test Connection"
              }
            ),
            connectionStatus !== null && /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { textColor: connectionStatus ? "success600" : "danger600", children: connectionStatus ? "Connected" : "Connection failed" })
          ] })
        ] }) }) })
      ] }),
      /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Button, { onClick: handleSave, loading: isSaving, children: "Save Settings" }) })
    ] })
  ] });
};
exports.default = Settings;
