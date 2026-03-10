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
  const [contentTypes, setContentTypes] = react.useState([]);
  const [isLoading, setIsLoading] = react.useState(true);
  const [isSaving, setIsSaving] = react.useState(false);
  const [isTestingConnection, setIsTestingConnection] = react.useState(false);
  const [connectionStatus, setConnectionStatus] = react.useState(null);
  react.useEffect(() => {
    fetchSettings();
    fetchContentTypes();
  }, []);
  const fetchSettings = async () => {
    try {
      const response = await get("/strapi-localize/settings");
      setSettings(response.data || response || {});
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };
  const fetchContentTypes = async () => {
    try {
      const response = await get("/strapi-localize/content-types");
      setContentTypes(response.data || response || []);
    } catch (error) {
      console.error("Failed to load content types:", error);
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
  const handleContentTypeToggle = (contentTypeUid) => {
    setSettings((prev) => ({
      ...prev,
      contentTypes: {
        ...prev.contentTypes,
        [contentTypeUid]: {
          ...prev.contentTypes?.[contentTypeUid],
          enabled: !prev.contentTypes?.[contentTypeUid]?.enabled
        }
      }
    }));
  };
  const handleAutoTranslateToggle = (contentTypeUid) => {
    setSettings((prev) => ({
      ...prev,
      contentTypes: {
        ...prev.contentTypes,
        [contentTypeUid]: {
          ...prev.contentTypes?.[contentTypeUid],
          autoTranslate: !prev.contentTypes?.[contentTypeUid]?.autoTranslate
        }
      }
    }));
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
          /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { gap: 2, alignItems: "center", children: [
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
            connectionStatus !== null && /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { textColor: connectionStatus ? "success600" : "danger600", children: connectionStatus ? "✓ Connected" : "✗ Connection failed" })
          ] }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Divider, {}),
          /* @__PURE__ */ jsxRuntime.jsx(
            designSystem.Checkbox,
            {
              checked: settings.autoTranslate || false,
              onCheckedChange: (checked) => setSettings({ ...settings, autoTranslate: checked }),
              children: "Enable global auto-translation (translate content automatically when saved)"
            }
          )
        ] }) }) })
      ] }),
      /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Card, { children: [
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.CardHeader, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "beta", children: "Content Type Configuration" }) }),
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.CardBody, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.CardContent, { children: contentTypes.length === 0 ? /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { textColor: "neutral600", children: "No localizable content types found. Please ensure you have content types with i18n enabled." }) : /* @__PURE__ */ jsxRuntime.jsx(designSystem.Flex, { direction: "column", gap: 4, children: contentTypes.map((contentType) => {
          const ctSettings = settings.contentTypes?.[contentType.uid] || {};
          return /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { padding: 4, background: "neutral100", hasRadius: true, children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { direction: "column", gap: 3, children: [
            /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "delta", fontWeight: "bold", children: contentType.displayName }),
            /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "pi", textColor: "neutral600", children: contentType.uid }),
            /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { gap: 4, children: [
              /* @__PURE__ */ jsxRuntime.jsx(
                designSystem.Checkbox,
                {
                  checked: ctSettings.enabled || false,
                  onCheckedChange: () => handleContentTypeToggle(contentType.uid),
                  children: "Enable translation"
                }
              ),
              ctSettings.enabled && /* @__PURE__ */ jsxRuntime.jsx(
                designSystem.Checkbox,
                {
                  checked: ctSettings.autoTranslate || false,
                  onCheckedChange: () => handleAutoTranslateToggle(contentType.uid),
                  children: "Auto-translate on save"
                }
              )
            ] })
          ] }) }, contentType.uid);
        }) }) }) })
      ] }),
      /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Button, { onClick: handleSave, loading: isSaving, children: "Save Settings" }) })
    ] })
  ] });
};
exports.default = Settings;
