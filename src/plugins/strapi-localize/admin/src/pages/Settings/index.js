import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Flex,
  Typography,
  TextInput,
  Toggle,
  Alert,
  Loader,
  Grid,
  Card,
  CardHeader,
  CardBody,
  CardContent,
  MultiSelect,
  MultiSelectOption,
  Table,
  Thead,
  Tbody,
  Tr,
  Td,
  Th,
  IconButton,
  Select,
  Option,
} from '@strapi/design-system';
import { Check, ExclamationMarkCircle, Trash, Plus } from '@strapi/icons';
import { useFetchClient, useNotification } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';

const Settings = () => {
  const { formatMessage } = useIntl();
  const { get, put, post } = useFetchClient();
  const toggleNotification = useNotification();

  const [settings, setSettings] = useState({
    apiKey: '',
    contentTypes: {},
    autoTranslate: false,
    glossary: [],
  });
  const [contentTypes, setContentTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [availableLanguages, setAvailableLanguages] = useState([]);
  const [newGlossaryEntry, setNewGlossaryEntry] = useState({
    term: '',
    translations: {},
  });
  const [isSyncingGlossaries, setIsSyncingGlossaries] = useState(false);
  const [glossarySyncStatus, setGlossarySyncStatus] = useState(null);

  useEffect(() => {
    fetchSettings();
    fetchContentTypes();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await get('/strapi-localize/settings');
      setSettings(data.data || data);
    } catch (error) {
      toggleNotification({
        type: 'warning',
        message: 'Failed to load settings',
      });
    }
  };

  const fetchContentTypes = async () => {
    try {
      const data = await get('/strapi-localize/content-types');
      setContentTypes(data.data || data);
      setIsLoading(false);
    } catch (error) {
      toggleNotification({
        type: 'warning',
        message: 'Failed to load content types',
      });
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await put('/strapi-localize/settings', settings);
      toggleNotification({
        type: 'success',
        message: 'Settings saved successfully',
      });
    } catch (error) {
      toggleNotification({
        type: 'warning',
        message: 'Failed to save settings',
      });
    }
    setIsSaving(false);
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    try {
      const response = await post('/strapi-localize/test-connection');
      const data = response.data || response;
      setConnectionStatus(data.success);
      if (data.success) {
        setAvailableLanguages(data.languages || []);
        toggleNotification({
          type: 'success',
          message: `Connected! ${data.languages.length} languages available`,
        });
      } else {
        toggleNotification({
          type: 'warning',
          message: data.error || 'Connection failed',
        });
      }
    } catch (error) {
      setConnectionStatus(false);
      toggleNotification({
        type: 'warning',
        message: 'Connection test failed',
      });
    }
    setIsTestingConnection(false);
  };

  const handleContentTypeToggle = (contentTypeUid) => {
    setSettings(prev => ({
      ...prev,
      contentTypes: {
        ...prev.contentTypes,
        [contentTypeUid]: {
          ...prev.contentTypes[contentTypeUid],
          enabled: !prev.contentTypes[contentTypeUid]?.enabled,
        },
      },
    }));
  };

  const handleAutoTranslateToggle = (contentTypeUid) => {
    setSettings(prev => ({
      ...prev,
      contentTypes: {
        ...prev.contentTypes,
        [contentTypeUid]: {
          ...prev.contentTypes[contentTypeUid],
          autoTranslate: !prev.contentTypes[contentTypeUid]?.autoTranslate,
        },
      },
    }));
  };

  const handleIgnoredFieldsChange = (contentTypeUid, fields) => {
    setSettings(prev => ({
      ...prev,
      contentTypes: {
        ...prev.contentTypes,
        [contentTypeUid]: {
          ...prev.contentTypes[contentTypeUid],
          ignoredFields: fields,
        },
      },
    }));
  };

  const handleAddGlossaryEntry = () => {
    if (!newGlossaryEntry.term.trim()) {
      toggleNotification({
        type: 'warning',
        message: 'Please enter a term',
      });
      return;
    }

    setSettings(prev => ({
      ...prev,
      glossary: [...(prev.glossary || []), { ...newGlossaryEntry, id: Date.now() }],
    }));

    setNewGlossaryEntry({
      term: '',
      translations: {},
    });
  };

  const handleRemoveGlossaryEntry = (id) => {
    setSettings(prev => ({
      ...prev,
      glossary: (prev.glossary || []).filter(entry => entry.id !== id),
    }));
  };

  const handleGlossaryTranslationChange = (entryId, language, translation) => {
    setSettings(prev => ({
      ...prev,
      glossary: (prev.glossary || []).map(entry =>
        entry.id === entryId
          ? { ...entry, translations: { ...entry.translations, [language]: translation } }
          : entry
      ),
    }));
  };

  const handleSyncGlossaries = async () => {
    setIsSyncingGlossaries(true);
    setGlossarySyncStatus(null);

    try {
      const response = await post('/strapi-localize/sync-glossaries');
      const data = response.data || response;

      if (data.success) {
        setGlossarySyncStatus('success');
        toggleNotification({
          type: 'success',
          message: 'Glossaries synced with DeepL successfully',
        });
      } else {
        setGlossarySyncStatus('error');
        toggleNotification({
          type: 'warning',
          message: data.error || 'Failed to sync glossaries',
        });
      }
    } catch (error) {
      setGlossarySyncStatus('error');
      toggleNotification({
        type: 'warning',
        message: 'Failed to sync glossaries with DeepL',
      });
    }

    setIsSyncingGlossaries(false);
  };

  if (isLoading) {
    return (
      <Box padding={8}>
        <Loader>Loading settings...</Loader>
      </Box>
    );
  }

  return (
    <Box padding={8}>
      <Typography variant="alpha" marginBottom={4}>
        DeepL Translate Settings
      </Typography>

      <Grid gap={6}>
        <Card>
          <CardHeader>
            <Typography variant="beta">API Configuration</Typography>
          </CardHeader>
          <CardBody>
            <CardContent>
              <Flex direction="column" gap={4}>
                <TextInput
                  type="password"
                  label="DeepL API Key"
                  name="apiKey"
                  value={settings.apiKey}
                  onChange={(e) =>
                    setSettings({ ...settings, apiKey: e.target.value })
                  }
                  hint="Enter your DeepL API key (Free or Pro)"
                />

                <Flex gap={2}>
                  <Button
                    onClick={handleTestConnection}
                    loading={isTestingConnection}
                    disabled={!settings.apiKey}
                    variant="secondary"
                  >
                    Test Connection
                  </Button>
                  {connectionStatus !== null && (
                    <Box paddingLeft={2}>
                      {connectionStatus ? (
                        <Flex gap={1} alignItems="center">
                          <Check color="success" />
                          <Typography textColor="success600">
                            Connected
                          </Typography>
                        </Flex>
                      ) : (
                        <Flex gap={1} alignItems="center">
                          <ExclamationMarkCircle color="danger" />
                          <Typography textColor="danger600">
                            Connection failed
                          </Typography>
                        </Flex>
                      )}
                    </Box>
                  )}
                </Flex>

                <Box>
                  <Toggle
                    label="Enable global auto-translation"
                    hint="Automatically translate content when it's created or updated"
                    checked={settings.autoTranslate}
                    onChange={() =>
                      setSettings({
                        ...settings,
                        autoTranslate: !settings.autoTranslate,
                      })
                    }
                  />
                </Box>
              </Flex>
            </CardContent>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <Typography variant="beta">Content Type Configuration</Typography>
          </CardHeader>
          <CardBody>
            <CardContent>
              {contentTypes.length === 0 ? (
                <Alert
                  variant="warning"
                  title="No localizable content types found"
                >
                  Please ensure you have content types with i18n enabled
                </Alert>
              ) : (
                <Flex direction="column" gap={4}>
                  {contentTypes.map((contentType) => {
                    const ctSettings =
                      settings.contentTypes[contentType.uid] || {};
                    return (
                      <Card key={contentType.uid}>
                        <CardBody>
                          <CardContent>
                            <Flex direction="column" gap={3}>
                              <Typography variant="sigma">
                                {contentType.displayName}
                              </Typography>

                              <Flex gap={4}>
                                <Toggle
                                  label="Enable translation"
                                  checked={ctSettings.enabled || false}
                                  onChange={() =>
                                    handleContentTypeToggle(contentType.uid)
                                  }
                                />

                                {ctSettings.enabled && (
                                  <Toggle
                                    label="Auto-translate"
                                    checked={ctSettings.autoTranslate || false}
                                    onChange={() =>
                                      handleAutoTranslateToggle(contentType.uid)
                                    }
                                  />
                                )}
                              </Flex>

                              {ctSettings.enabled && (
                                <Box>
                                  <MultiSelect
                                    label="Fields to ignore"
                                    hint="Select fields that should not be translated"
                                    value={ctSettings.ignoredFields || []}
                                    onChange={(values) =>
                                      handleIgnoredFieldsChange(
                                        contentType.uid,
                                        values
                                      )
                                    }
                                  >
                                    {contentType.fields.map((field) => (
                                      <MultiSelectOption
                                        key={field}
                                        value={field}
                                      >
                                        {field}
                                      </MultiSelectOption>
                                    ))}
                                  </MultiSelect>
                                </Box>
                              )}
                            </Flex>
                          </CardContent>
                        </CardBody>
                      </Card>
                    );
                  })}
                </Flex>
              )}
            </CardContent>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <Flex justifyContent="space-between" alignItems="center">
              <Typography variant="beta">Translation Glossary</Typography>
              <Button
                onClick={handleSyncGlossaries}
                loading={isSyncingGlossaries}
                disabled={!settings.apiKey || (!settings.glossary || settings.glossary.length === 0)}
                variant="secondary"
                size="S"
              >
                Sync with DeepL
              </Button>
            </Flex>
          </CardHeader>
          <CardBody>
            <CardContent>
              <Box marginBottom={4}>
                <Typography variant="pi" textColor="neutral600">
                  Define terms and their translations to ensure consistency across all translations. Glossaries are automatically synced with DeepL when you save settings.
                </Typography>
              </Box>

              {glossarySyncStatus === 'success' && (
                <Alert variant="success" marginBottom={4}>
                  Glossaries are synced with DeepL
                </Alert>
              )}

              {settings.glossaryIds && Object.keys(settings.glossaryIds).length > 0 && (
                <Box marginBottom={4}>
                  <Typography variant="pi" fontWeight="semiBold">
                    Active DeepL Glossaries: {Object.keys(settings.glossaryIds).length}
                  </Typography>
                </Box>
              )}

              <Flex direction="column" gap={4}>
                <Flex gap={2} alignItems="end">
                  <TextInput
                    label="Term"
                    placeholder="Enter a term (e.g., 'Strapi')"
                    value={newGlossaryEntry.term}
                    onChange={(e) =>
                      setNewGlossaryEntry({ ...newGlossaryEntry, term: e.target.value })
                    }
                  />
                  <Button
                    onClick={handleAddGlossaryEntry}
                    startIcon={<Plus />}
                    variant="secondary"
                  >
                    Add Term
                  </Button>
                </Flex>

                {settings.glossary && settings.glossary.length > 0 && (
                  <Box>
                    <Table>
                      <Thead>
                        <Tr>
                          <Th>Term</Th>
                          {availableLanguages.length > 0 && (
                            availableLanguages.slice(0, 3).map(lang => (
                              <Th key={lang.language}>{lang.name}</Th>
                            ))
                          )}
                          <Th>Actions</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {settings.glossary.map((entry) => (
                          <Tr key={entry.id}>
                            <Td>
                              <Typography fontWeight="semiBold">{entry.term}</Typography>
                            </Td>
                            {availableLanguages.length > 0 && (
                              availableLanguages.slice(0, 3).map(lang => (
                                <Td key={lang.language}>
                                  <TextInput
                                    placeholder={`Translation for ${lang.name}`}
                                    value={entry.translations[lang.language] || ''}
                                    onChange={(e) =>
                                      handleGlossaryTranslationChange(
                                        entry.id,
                                        lang.language,
                                        e.target.value
                                      )
                                    }
                                  />
                                </Td>
                              ))
                            )}
                            <Td>
                              <IconButton
                                onClick={() => handleRemoveGlossaryEntry(entry.id)}
                                label="Remove"
                                icon={<Trash />}
                                variant="ghost"
                              />
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </Box>
                )}

                {(!settings.glossary || settings.glossary.length === 0) && (
                  <Alert variant="default">
                    No glossary terms defined yet. Add terms above to ensure consistent translations.
                  </Alert>
                )}
              </Flex>
            </CardContent>
          </CardBody>
        </Card>
      </Grid>

      <Box marginTop={6}>
        <Button onClick={handleSave} loading={isSaving}>
          Save Settings
        </Button>
      </Box>
    </Box>
  );
};

export default Settings;