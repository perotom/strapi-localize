import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextInput,
  Button,
  Flex,
  Card,
  CardHeader,
  CardBody,
  CardContent,
  Field,
  Checkbox,
  Divider,
} from '@strapi/design-system';
import { useFetchClient, useNotification } from '@strapi/strapi/admin';

const Settings = () => {
  const { get, put, post } = useFetchClient();
  const { toggleNotification } = useNotification();

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
      const response = await get('/strapi-localize/settings');
      setSettings(response.data || response || {});
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const fetchContentTypes = async () => {
    try {
      const response = await get('/strapi-localize/content-types');
      setContentTypes(response.data || response || []);
    } catch (error) {
      console.error('Failed to load content types:', error);
    }
    setIsLoading(false);
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
      toggleNotification({
        type: data.success ? 'success' : 'warning',
        message: data.success ? 'Connected to DeepL!' : (data.error || 'Connection failed'),
      });
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
          ...prev.contentTypes?.[contentTypeUid],
          enabled: !prev.contentTypes?.[contentTypeUid]?.enabled,
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
          ...prev.contentTypes?.[contentTypeUid],
          autoTranslate: !prev.contentTypes?.[contentTypeUid]?.autoTranslate,
        },
      },
    }));
  };

  if (isLoading) {
    return (
      <Box padding={8}>
        <Typography>Loading settings...</Typography>
      </Box>
    );
  }

  return (
    <Box padding={8}>
      <Typography variant="alpha" marginBottom={4}>
        DeepL Translate Settings
      </Typography>

      <Flex direction="column" gap={6}>
        {/* API Configuration */}
        <Card>
          <CardHeader>
            <Typography variant="beta">API Configuration</Typography>
          </CardHeader>
          <CardBody>
            <CardContent>
              <Flex direction="column" gap={4}>
                <Field.Root>
                  <Field.Label>DeepL API Key</Field.Label>
                  <TextInput
                    type="password"
                    name="apiKey"
                    value={settings.apiKey || ''}
                    onChange={(e) =>
                      setSettings({ ...settings, apiKey: e.target.value })
                    }
                  />
                  <Field.Hint>Enter your DeepL API key (Free or Pro)</Field.Hint>
                </Field.Root>

                <Flex gap={2} alignItems="center">
                  <Button
                    onClick={handleTestConnection}
                    loading={isTestingConnection}
                    disabled={!settings.apiKey}
                    variant="secondary"
                  >
                    Test Connection
                  </Button>
                  {connectionStatus !== null && (
                    <Typography textColor={connectionStatus ? 'success600' : 'danger600'}>
                      {connectionStatus ? '✓ Connected' : '✗ Connection failed'}
                    </Typography>
                  )}
                </Flex>

                <Divider />

                <Checkbox
                  checked={settings.autoTranslate || false}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, autoTranslate: checked })
                  }
                >
                  Enable global auto-translation (translate content automatically when saved)
                </Checkbox>
              </Flex>
            </CardContent>
          </CardBody>
        </Card>

        {/* Content Type Configuration */}
        <Card>
          <CardHeader>
            <Typography variant="beta">Content Type Configuration</Typography>
          </CardHeader>
          <CardBody>
            <CardContent>
              {contentTypes.length === 0 ? (
                <Typography textColor="neutral600">
                  No localizable content types found. Please ensure you have content types with i18n enabled.
                </Typography>
              ) : (
                <Flex direction="column" gap={4}>
                  {contentTypes.map((contentType) => {
                    const ctSettings = settings.contentTypes?.[contentType.uid] || {};
                    return (
                      <Box key={contentType.uid} padding={4} background="neutral100" hasRadius>
                        <Flex direction="column" gap={3}>
                          <Typography variant="delta" fontWeight="bold">
                            {contentType.displayName}
                          </Typography>
                          <Typography variant="pi" textColor="neutral600">
                            {contentType.uid}
                          </Typography>

                          <Flex gap={4}>
                            <Checkbox
                              checked={ctSettings.enabled || false}
                              onCheckedChange={() => handleContentTypeToggle(contentType.uid)}
                            >
                              Enable translation
                            </Checkbox>

                            {ctSettings.enabled && (
                              <Checkbox
                                checked={ctSettings.autoTranslate || false}
                                onCheckedChange={() => handleAutoTranslateToggle(contentType.uid)}
                              >
                                Auto-translate on save
                              </Checkbox>
                            )}
                          </Flex>
                        </Flex>
                      </Box>
                    );
                  })}
                </Flex>
              )}
            </CardContent>
          </CardBody>
        </Card>

        <Box>
          <Button onClick={handleSave} loading={isSaving}>
            Save Settings
          </Button>
        </Box>
      </Flex>
    </Box>
  );
};

export default Settings;
