import { jsx, jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Box, Loader, Typography, Grid, Card, CardHeader, CardBody, CardContent, Flex, TextInput, Button, Toggle, Alert, MultiSelect, MultiSelectOption, Table, Thead, Tr, Th, Tbody, Td, IconButton } from "@strapi/design-system";
import { Check, WarningCircle, Plus, Trash } from "@strapi/icons";
import { useFetchClient, useNotification } from "@strapi/strapi/admin";
import { useIntl } from "react-intl";
const Settings = () => {
  const { formatMessage } = useIntl();
  const { get, put, post } = useFetchClient();
  const toggleNotification = useNotification();
  const [settings, setSettings] = useState({
    apiKey: "",
    contentTypes: {},
    autoTranslate: false,
    glossary: []
  });
  const [contentTypes, setContentTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [availableLanguages, setAvailableLanguages] = useState([]);
  const [newGlossaryEntry, setNewGlossaryEntry] = useState({
    term: "",
    translations: {}
  });
  const [isSyncingGlossaries, setIsSyncingGlossaries] = useState(false);
  const [glossarySyncStatus, setGlossarySyncStatus] = useState(null);
  useEffect(() => {
    fetchSettings();
    fetchContentTypes();
  }, []);
  const fetchSettings = async () => {
    try {
      const data = await get("/strapi-localize/settings");
      setSettings(data.data || data);
    } catch (error) {
      toggleNotification({
        type: "warning",
        message: "Failed to load settings"
      });
    }
  };
  const fetchContentTypes = async () => {
    try {
      const data = await get("/strapi-localize/content-types");
      setContentTypes(data.data || data);
      setIsLoading(false);
    } catch (error) {
      toggleNotification({
        type: "warning",
        message: "Failed to load content types"
      });
      setIsLoading(false);
    }
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
      if (data.success) {
        setAvailableLanguages(data.languages || []);
        toggleNotification({
          type: "success",
          message: `Connected! ${data.languages.length} languages available`
        });
      } else {
        toggleNotification({
          type: "warning",
          message: data.error || "Connection failed"
        });
      }
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
          ...prev.contentTypes[contentTypeUid],
          enabled: !prev.contentTypes[contentTypeUid]?.enabled
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
          ...prev.contentTypes[contentTypeUid],
          autoTranslate: !prev.contentTypes[contentTypeUid]?.autoTranslate
        }
      }
    }));
  };
  const handleIgnoredFieldsChange = (contentTypeUid, fields) => {
    setSettings((prev) => ({
      ...prev,
      contentTypes: {
        ...prev.contentTypes,
        [contentTypeUid]: {
          ...prev.contentTypes[contentTypeUid],
          ignoredFields: fields
        }
      }
    }));
  };
  const handleAddGlossaryEntry = () => {
    if (!newGlossaryEntry.term.trim()) {
      toggleNotification({
        type: "warning",
        message: "Please enter a term"
      });
      return;
    }
    setSettings((prev) => ({
      ...prev,
      glossary: [...prev.glossary || [], { ...newGlossaryEntry, id: Date.now() }]
    }));
    setNewGlossaryEntry({
      term: "",
      translations: {}
    });
  };
  const handleRemoveGlossaryEntry = (id) => {
    setSettings((prev) => ({
      ...prev,
      glossary: (prev.glossary || []).filter((entry) => entry.id !== id)
    }));
  };
  const handleGlossaryTranslationChange = (entryId, language, translation) => {
    setSettings((prev) => ({
      ...prev,
      glossary: (prev.glossary || []).map(
        (entry) => entry.id === entryId ? { ...entry, translations: { ...entry.translations, [language]: translation } } : entry
      )
    }));
  };
  const handleSyncGlossaries = async () => {
    setIsSyncingGlossaries(true);
    setGlossarySyncStatus(null);
    try {
      const response = await post("/strapi-localize/sync-glossaries");
      const data = response.data || response;
      if (data.success) {
        setGlossarySyncStatus("success");
        toggleNotification({
          type: "success",
          message: "Glossaries synced with DeepL successfully"
        });
      } else {
        setGlossarySyncStatus("error");
        toggleNotification({
          type: "warning",
          message: data.error || "Failed to sync glossaries"
        });
      }
    } catch (error) {
      setGlossarySyncStatus("error");
      toggleNotification({
        type: "warning",
        message: "Failed to sync glossaries with DeepL"
      });
    }
    setIsSyncingGlossaries(false);
  };
  if (isLoading) {
    return /* @__PURE__ */ jsx(Box, { padding: 8, children: /* @__PURE__ */ jsx(Loader, { children: "Loading settings..." }) });
  }
  return /* @__PURE__ */ jsxs(Box, { padding: 8, children: [
    /* @__PURE__ */ jsx(Typography, { variant: "alpha", marginBottom: 4, children: "DeepL Translate Settings" }),
    /* @__PURE__ */ jsxs(Grid, { gap: 6, children: [
      /* @__PURE__ */ jsxs(Card, { children: [
        /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(Typography, { variant: "beta", children: "API Configuration" }) }),
        /* @__PURE__ */ jsx(CardBody, { children: /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs(Flex, { direction: "column", gap: 4, children: [
          /* @__PURE__ */ jsx(
            TextInput,
            {
              type: "password",
              label: "DeepL API Key",
              name: "apiKey",
              value: settings.apiKey,
              onChange: (e) => setSettings({ ...settings, apiKey: e.target.value }),
              hint: "Enter your DeepL API key (Free or Pro)"
            }
          ),
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
            connectionStatus !== null && /* @__PURE__ */ jsx(Box, { paddingLeft: 2, children: connectionStatus ? /* @__PURE__ */ jsxs(Flex, { gap: 1, alignItems: "center", children: [
              /* @__PURE__ */ jsx(Check, { color: "success" }),
              /* @__PURE__ */ jsx(Typography, { textColor: "success600", children: "Connected" })
            ] }) : /* @__PURE__ */ jsxs(Flex, { gap: 1, alignItems: "center", children: [
              /* @__PURE__ */ jsx(WarningCircle, { color: "danger" }),
              /* @__PURE__ */ jsx(Typography, { textColor: "danger600", children: "Connection failed" })
            ] }) })
          ] }),
          /* @__PURE__ */ jsx(Box, { children: /* @__PURE__ */ jsx(
            Toggle,
            {
              label: "Enable global auto-translation",
              hint: "Automatically translate content when it's created or updated",
              checked: settings.autoTranslate,
              onChange: () => setSettings({
                ...settings,
                autoTranslate: !settings.autoTranslate
              })
            }
          ) })
        ] }) }) })
      ] }),
      /* @__PURE__ */ jsxs(Card, { children: [
        /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(Typography, { variant: "beta", children: "Content Type Configuration" }) }),
        /* @__PURE__ */ jsx(CardBody, { children: /* @__PURE__ */ jsx(CardContent, { children: contentTypes.length === 0 ? /* @__PURE__ */ jsx(
          Alert,
          {
            variant: "warning",
            title: "No localizable content types found",
            children: "Please ensure you have content types with i18n enabled"
          }
        ) : /* @__PURE__ */ jsx(Flex, { direction: "column", gap: 4, children: contentTypes.map((contentType) => {
          const ctSettings = settings.contentTypes[contentType.uid] || {};
          return /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardBody, { children: /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs(Flex, { direction: "column", gap: 3, children: [
            /* @__PURE__ */ jsx(Typography, { variant: "sigma", children: contentType.displayName }),
            /* @__PURE__ */ jsxs(Flex, { gap: 4, children: [
              /* @__PURE__ */ jsx(
                Toggle,
                {
                  label: "Enable translation",
                  checked: ctSettings.enabled || false,
                  onChange: () => handleContentTypeToggle(contentType.uid)
                }
              ),
              ctSettings.enabled && /* @__PURE__ */ jsx(
                Toggle,
                {
                  label: "Auto-translate",
                  checked: ctSettings.autoTranslate || false,
                  onChange: () => handleAutoTranslateToggle(contentType.uid)
                }
              )
            ] }),
            ctSettings.enabled && /* @__PURE__ */ jsx(Box, { children: /* @__PURE__ */ jsx(
              MultiSelect,
              {
                label: "Fields to ignore",
                hint: "Select fields that should not be translated",
                value: ctSettings.ignoredFields || [],
                onChange: (values) => handleIgnoredFieldsChange(
                  contentType.uid,
                  values
                ),
                children: contentType.fields.map((field) => /* @__PURE__ */ jsx(
                  MultiSelectOption,
                  {
                    value: field,
                    children: field
                  },
                  field
                ))
              }
            ) })
          ] }) }) }) }, contentType.uid);
        }) }) }) })
      ] }),
      /* @__PURE__ */ jsxs(Card, { children: [
        /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsxs(Flex, { justifyContent: "space-between", alignItems: "center", children: [
          /* @__PURE__ */ jsx(Typography, { variant: "beta", children: "Translation Glossary" }),
          /* @__PURE__ */ jsx(
            Button,
            {
              onClick: handleSyncGlossaries,
              loading: isSyncingGlossaries,
              disabled: !settings.apiKey || (!settings.glossary || settings.glossary.length === 0),
              variant: "secondary",
              size: "S",
              children: "Sync with DeepL"
            }
          )
        ] }) }),
        /* @__PURE__ */ jsx(CardBody, { children: /* @__PURE__ */ jsxs(CardContent, { children: [
          /* @__PURE__ */ jsx(Box, { marginBottom: 4, children: /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "neutral600", children: "Define terms and their translations to ensure consistency across all translations. Glossaries are automatically synced with DeepL when you save settings." }) }),
          glossarySyncStatus === "success" && /* @__PURE__ */ jsx(Alert, { variant: "success", marginBottom: 4, children: "Glossaries are synced with DeepL" }),
          settings.glossaryIds && Object.keys(settings.glossaryIds).length > 0 && /* @__PURE__ */ jsx(Box, { marginBottom: 4, children: /* @__PURE__ */ jsxs(Typography, { variant: "pi", fontWeight: "semiBold", children: [
            "Active DeepL Glossaries: ",
            Object.keys(settings.glossaryIds).length
          ] }) }),
          /* @__PURE__ */ jsxs(Flex, { direction: "column", gap: 4, children: [
            /* @__PURE__ */ jsxs(Flex, { gap: 2, alignItems: "end", children: [
              /* @__PURE__ */ jsx(
                TextInput,
                {
                  label: "Term",
                  placeholder: "Enter a term (e.g., 'Strapi')",
                  value: newGlossaryEntry.term,
                  onChange: (e) => setNewGlossaryEntry({ ...newGlossaryEntry, term: e.target.value })
                }
              ),
              /* @__PURE__ */ jsx(
                Button,
                {
                  onClick: handleAddGlossaryEntry,
                  startIcon: /* @__PURE__ */ jsx(Plus, {}),
                  variant: "secondary",
                  children: "Add Term"
                }
              )
            ] }),
            settings.glossary && settings.glossary.length > 0 && /* @__PURE__ */ jsx(Box, { children: /* @__PURE__ */ jsxs(Table, { children: [
              /* @__PURE__ */ jsx(Thead, { children: /* @__PURE__ */ jsxs(Tr, { children: [
                /* @__PURE__ */ jsx(Th, { children: "Term" }),
                availableLanguages.length > 0 && availableLanguages.slice(0, 3).map((lang) => /* @__PURE__ */ jsx(Th, { children: lang.name }, lang.language)),
                /* @__PURE__ */ jsx(Th, { children: "Actions" })
              ] }) }),
              /* @__PURE__ */ jsx(Tbody, { children: settings.glossary.map((entry) => /* @__PURE__ */ jsxs(Tr, { children: [
                /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(Typography, { fontWeight: "semiBold", children: entry.term }) }),
                availableLanguages.length > 0 && availableLanguages.slice(0, 3).map((lang) => /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(
                  TextInput,
                  {
                    placeholder: `Translation for ${lang.name}`,
                    value: entry.translations[lang.language] || "",
                    onChange: (e) => handleGlossaryTranslationChange(
                      entry.id,
                      lang.language,
                      e.target.value
                    )
                  }
                ) }, lang.language)),
                /* @__PURE__ */ jsx(Td, { children: /* @__PURE__ */ jsx(
                  IconButton,
                  {
                    onClick: () => handleRemoveGlossaryEntry(entry.id),
                    label: "Remove",
                    icon: /* @__PURE__ */ jsx(Trash, {}),
                    variant: "ghost"
                  }
                ) })
              ] }, entry.id)) })
            ] }) }),
            (!settings.glossary || settings.glossary.length === 0) && /* @__PURE__ */ jsx(Alert, { variant: "default", children: "No glossary terms defined yet. Add terms above to ensure consistent translations." })
          ] })
        ] }) })
      ] })
    ] }),
    /* @__PURE__ */ jsx(Box, { marginTop: 6, children: /* @__PURE__ */ jsx(Button, { onClick: handleSave, loading: isSaving, children: "Save Settings" }) })
  ] });
};
export {
  Settings as default
};
