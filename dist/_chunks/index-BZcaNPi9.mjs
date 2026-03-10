import { jsx, jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Box, Typography, Flex, Card, CardHeader, CardBody, CardContent, Field, TextInput, Button, Divider, Checkbox } from "@strapi/design-system";
import { useFetchClient, useNotification } from "@strapi/strapi/admin";
const Settings = () => {
  const { get, put, post } = useFetchClient();
  const { toggleNotification } = useNotification();
  const [settings, setSettings] = useState({
    apiKey: "",
    contentTypes: {},
    autoTranslate: false
  });
  const [contentTypes, setContentTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  useEffect(() => {
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
    return /* @__PURE__ */ jsx(Box, { padding: 8, children: /* @__PURE__ */ jsx(Typography, { children: "Loading settings..." }) });
  }
  return /* @__PURE__ */ jsxs(Box, { padding: 8, children: [
    /* @__PURE__ */ jsx(Typography, { variant: "alpha", marginBottom: 4, children: "DeepL Translate Settings" }),
    /* @__PURE__ */ jsxs(Flex, { direction: "column", gap: 6, children: [
      /* @__PURE__ */ jsxs(Card, { children: [
        /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(Typography, { variant: "beta", children: "API Configuration" }) }),
        /* @__PURE__ */ jsx(CardBody, { children: /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs(Flex, { direction: "column", gap: 4, children: [
          /* @__PURE__ */ jsxs(Field.Root, { children: [
            /* @__PURE__ */ jsx(Field.Label, { children: "DeepL API Key" }),
            /* @__PURE__ */ jsx(
              TextInput,
              {
                type: "password",
                name: "apiKey",
                value: settings.apiKey || "",
                onChange: (e) => setSettings({ ...settings, apiKey: e.target.value })
              }
            ),
            /* @__PURE__ */ jsx(Field.Hint, { children: "Enter your DeepL API key (Free or Pro)" })
          ] }),
          /* @__PURE__ */ jsxs(Flex, { gap: 2, alignItems: "center", children: [
            /* @__PURE__ */ jsx(
              Button,
              {
                onClick: handleTestConnection,
                loading: isTestingConnection,
                disabled: !settings.apiKey,
                variant: "secondary",
                children: "Test Connection"
              }
            ),
            connectionStatus !== null && /* @__PURE__ */ jsx(Typography, { textColor: connectionStatus ? "success600" : "danger600", children: connectionStatus ? "✓ Connected" : "✗ Connection failed" })
          ] }),
          /* @__PURE__ */ jsx(Divider, {}),
          /* @__PURE__ */ jsx(
            Checkbox,
            {
              checked: settings.autoTranslate || false,
              onCheckedChange: (checked) => setSettings({ ...settings, autoTranslate: checked }),
              children: "Enable global auto-translation (translate content automatically when saved)"
            }
          )
        ] }) }) })
      ] }),
      /* @__PURE__ */ jsxs(Card, { children: [
        /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(Typography, { variant: "beta", children: "Content Type Configuration" }) }),
        /* @__PURE__ */ jsx(CardBody, { children: /* @__PURE__ */ jsx(CardContent, { children: contentTypes.length === 0 ? /* @__PURE__ */ jsx(Typography, { textColor: "neutral600", children: "No localizable content types found. Please ensure you have content types with i18n enabled." }) : /* @__PURE__ */ jsx(Flex, { direction: "column", gap: 4, children: contentTypes.map((contentType) => {
          const ctSettings = settings.contentTypes?.[contentType.uid] || {};
          return /* @__PURE__ */ jsx(Box, { padding: 4, background: "neutral100", hasRadius: true, children: /* @__PURE__ */ jsxs(Flex, { direction: "column", gap: 3, children: [
            /* @__PURE__ */ jsx(Typography, { variant: "delta", fontWeight: "bold", children: contentType.displayName }),
            /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "neutral600", children: contentType.uid }),
            /* @__PURE__ */ jsxs(Flex, { gap: 4, children: [
              /* @__PURE__ */ jsx(
                Checkbox,
                {
                  checked: ctSettings.enabled || false,
                  onCheckedChange: () => handleContentTypeToggle(contentType.uid),
                  children: "Enable translation"
                }
              ),
              ctSettings.enabled && /* @__PURE__ */ jsx(
                Checkbox,
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
      /* @__PURE__ */ jsx(Box, { children: /* @__PURE__ */ jsx(Button, { onClick: handleSave, loading: isSaving, children: "Save Settings" }) })
    ] })
  ] });
};
export {
  Settings as default
};
