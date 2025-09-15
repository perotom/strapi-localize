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
} from '@strapi/design-system';
import { Check, ExclamationMarkCircle } from '@strapi/icons';
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
      const data = await get('/deepl-translate/settings');
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
      const data = await get('/deepl-translate/content-types');
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
      await put('/deepl-translate/settings', settings);
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
      const response = await post('/deepl-translate/test-connection');
      const data = response.data || response;
      setConnectionStatus(data.success);
      if (data.success) {
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