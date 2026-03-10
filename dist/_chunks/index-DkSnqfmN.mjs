import { jsx, jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Box, Typography, Button, Flex, Grid, Field, TextInput, Badge, Divider, Checkbox } from "@strapi/design-system";
import { useFetchClient, useNotification, Layouts } from "@strapi/strapi/admin";
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
    return /* @__PURE__ */ jsx(Layouts.Root, { children: /* @__PURE__ */ jsx(Layouts.Content, { children: /* @__PURE__ */ jsx(Box, { padding: 8, children: /* @__PURE__ */ jsx(Typography, { children: "Loading settings..." }) }) }) });
  }
  return /* @__PURE__ */ jsxs(Layouts.Root, { children: [
    /* @__PURE__ */ jsx(
      Layouts.Header,
      {
        title: "Strapi Localize",
        subtitle: "Automatic content translation using DeepL",
        primaryAction: /* @__PURE__ */ jsx(Button, { onClick: handleSave, loading: isSaving, children: "Save" })
      }
    ),
    /* @__PURE__ */ jsx(Layouts.Content, { children: /* @__PURE__ */ jsxs(Flex, { direction: "column", gap: 6, children: [
      /* @__PURE__ */ jsx(Box, { background: "neutral0", padding: 6, shadow: "filterShadow", hasRadius: true, children: /* @__PURE__ */ jsxs(Flex, { direction: "column", gap: 4, children: [
        /* @__PURE__ */ jsx(Typography, { variant: "delta", fontWeight: "bold", children: "DeepL API Configuration" }),
        /* @__PURE__ */ jsxs(Grid.Root, { gap: 4, children: [
          /* @__PURE__ */ jsx(Grid.Item, { col: 6, s: 12, children: /* @__PURE__ */ jsxs(Field.Root, { width: "100%", children: [
            /* @__PURE__ */ jsx(Field.Label, { children: "API Key" }),
            /* @__PURE__ */ jsx(
              TextInput,
              {
                type: "password",
                name: "apiKey",
                placeholder: "Enter your DeepL API key",
                value: settings.apiKey || "",
                onChange: (e) => setSettings({ ...settings, apiKey: e.target.value })
              }
            ),
            /* @__PURE__ */ jsx(Field.Hint, { children: "Get your API key from deepl.com" })
          ] }) }),
          /* @__PURE__ */ jsx(Grid.Item, { col: 6, s: 12, children: /* @__PURE__ */ jsxs(Field.Root, { children: [
            /* @__PURE__ */ jsx(Field.Label, { children: "Connection Status" }),
            /* @__PURE__ */ jsxs(Flex, { gap: 3, alignItems: "center", paddingTop: 2, children: [
              /* @__PURE__ */ jsx(
                Button,
                {
                  onClick: handleTestConnection,
                  loading: isTestingConnection,
                  disabled: !settings.apiKey,
                  variant: "secondary",
                  size: "S",
                  children: "Test Connection"
                }
              ),
              connectionStatus !== null && /* @__PURE__ */ jsx(Badge, { active: connectionStatus, backgroundColor: connectionStatus ? "success100" : "danger100", textColor: connectionStatus ? "success700" : "danger700", children: connectionStatus ? "Connected" : "Failed" })
            ] })
          ] }) })
        ] }),
        /* @__PURE__ */ jsx(Divider, {}),
        /* @__PURE__ */ jsx(
          Checkbox,
          {
            checked: settings.autoTranslate || false,
            onCheckedChange: (checked) => setSettings({ ...settings, autoTranslate: checked }),
            children: /* @__PURE__ */ jsx(Typography, { fontWeight: "semiBold", children: "Enable auto-translation globally" })
          }
        ),
        /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "neutral600", children: "When enabled, content will be automatically translated to all locales when saved." })
      ] }) }),
      /* @__PURE__ */ jsx(Box, { background: "neutral0", padding: 6, shadow: "filterShadow", hasRadius: true, children: /* @__PURE__ */ jsxs(Flex, { direction: "column", gap: 4, children: [
        /* @__PURE__ */ jsx(Typography, { variant: "delta", fontWeight: "bold", children: "Content Types" }),
        /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "neutral600", children: "Select which content types should be translated. Only content types with i18n enabled are shown." }),
        contentTypes.length === 0 ? /* @__PURE__ */ jsx(Box, { padding: 4, background: "neutral100", hasRadius: true, children: /* @__PURE__ */ jsx(Typography, { textColor: "neutral600", children: "No localizable content types found. Enable i18n on your content types first." }) }) : /* @__PURE__ */ jsx(Box, { children: contentTypes.map((contentType, index) => {
          const ctSettings = settings.contentTypes?.[contentType.uid] || {};
          return /* @__PURE__ */ jsxs(Box, { children: [
            index > 0 && /* @__PURE__ */ jsx(Divider, {}),
            /* @__PURE__ */ jsx(Box, { paddingTop: 4, paddingBottom: 4, children: /* @__PURE__ */ jsxs(Flex, { justifyContent: "space-between", alignItems: "flex-start", children: [
              /* @__PURE__ */ jsxs(Box, { children: [
                /* @__PURE__ */ jsx(Typography, { variant: "omega", fontWeight: "bold", children: contentType.displayName }),
                /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "neutral500", children: contentType.uid })
              ] }),
              /* @__PURE__ */ jsxs(Flex, { gap: 4, children: [
                /* @__PURE__ */ jsx(
                  Checkbox,
                  {
                    checked: ctSettings.enabled || false,
                    onCheckedChange: () => handleContentTypeToggle(contentType.uid),
                    children: "Enable"
                  }
                ),
                ctSettings.enabled && /* @__PURE__ */ jsx(
                  Checkbox,
                  {
                    checked: ctSettings.autoTranslate || false,
                    onCheckedChange: () => handleAutoTranslateToggle(contentType.uid),
                    children: "Auto-translate"
                  }
                )
              ] })
            ] }) })
          ] }, contentType.uid);
        }) })
      ] }) })
    ] }) })
  ] });
};
export {
  Settings as default
};
