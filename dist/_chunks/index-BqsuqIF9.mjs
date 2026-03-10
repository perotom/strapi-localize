import { jsx, jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Box, Typography, Flex, Card, CardHeader, CardBody, CardContent, Field, TextInput, Button } from "@strapi/design-system";
import { useFetchClient, useNotification } from "@strapi/strapi/admin";
const Settings = () => {
  const { get, put, post } = useFetchClient();
  const { toggleNotification } = useNotification();
  const [settings, setSettings] = useState({
    apiKey: "",
    contentTypes: {},
    autoTranslate: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  useEffect(() => {
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
          /* @__PURE__ */ jsxs(Flex, { gap: 2, children: [
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
            connectionStatus !== null && /* @__PURE__ */ jsx(Typography, { textColor: connectionStatus ? "success600" : "danger600", children: connectionStatus ? "Connected" : "Connection failed" })
          ] })
        ] }) }) })
      ] }),
      /* @__PURE__ */ jsx(Box, { children: /* @__PURE__ */ jsx(Button, { onClick: handleSave, loading: isSaving, children: "Save Settings" }) })
    ] })
  ] });
};
export {
  Settings as default
};
