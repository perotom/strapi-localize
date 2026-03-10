import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextInput,
  Button,
  Flex,
  Field,
  Checkbox,
  Divider,
  Grid,
  Badge,
} from '@strapi/design-system';
import {
  useFetchClient,
  useNotification,
  Layouts,
} from '@strapi/strapi/admin';

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
      <Layouts.Root>
        <Layouts.Content>
          <Box padding={8}>
            <Typography>Loading settings...</Typography>
          </Box>
        </Layouts.Content>
      </Layouts.Root>
    );
  }

  return (
    <Layouts.Root>
      <Layouts.Header
        title="Strapi Localize"
        subtitle="Automatic content translation using DeepL"
        primaryAction={
          <Button onClick={handleSave} loading={isSaving}>
            Save
          </Button>
        }
      />
      <Layouts.Content>
        <Flex direction="column" gap={6}>
          {/* API Configuration */}
          <Box background="neutral0" padding={6} shadow="filterShadow" hasRadius>
            <Flex direction="column" gap={4}>
              <Typography variant="delta" fontWeight="bold">
                DeepL API Configuration
              </Typography>

              <Grid.Root gap={4}>
                <Grid.Item col={6} s={12}>
                  <Field.Root width="100%">
                    <Field.Label>API Key</Field.Label>
                    <TextInput
                      type="password"
                      name="apiKey"
                      placeholder="Enter your DeepL API key"
                      value={settings.apiKey || ''}
                      onChange={(e) =>
                        setSettings({ ...settings, apiKey: e.target.value })
                      }
                    />
                    <Field.Hint>Get your API key from deepl.com</Field.Hint>
                  </Field.Root>
                </Grid.Item>
                <Grid.Item col={6} s={12}>
                  <Field.Root>
                    <Field.Label>Connection Status</Field.Label>
                    <Flex gap={3} alignItems="center" paddingTop={2}>
                      <Button
                        onClick={handleTestConnection}
                        loading={isTestingConnection}
                        disabled={!settings.apiKey}
                        variant="secondary"
                        size="S"
                      >
                        Test Connection
                      </Button>
                      {connectionStatus !== null && (
                        <Badge active={connectionStatus} backgroundColor={connectionStatus ? 'success100' : 'danger100'} textColor={connectionStatus ? 'success700' : 'danger700'}>
                          {connectionStatus ? 'Connected' : 'Failed'}
                        </Badge>
                      )}
                    </Flex>
                  </Field.Root>
                </Grid.Item>
              </Grid.Root>

              <Divider />

              <Checkbox
                checked={settings.autoTranslate || false}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, autoTranslate: checked })
                }
              >
                <Typography fontWeight="semiBold">Enable auto-translation globally</Typography>
              </Checkbox>
              <Typography variant="pi" textColor="neutral600">
                When enabled, content will be automatically translated to all locales when saved.
              </Typography>
            </Flex>
          </Box>

          {/* Content Type Configuration */}
          <Box background="neutral0" padding={6} shadow="filterShadow" hasRadius>
            <Flex direction="column" gap={4}>
              <Typography variant="delta" fontWeight="bold">
                Content Types
              </Typography>
              <Typography variant="pi" textColor="neutral600">
                Select which content types should be translated. Only content types with i18n enabled are shown.
              </Typography>

              {contentTypes.length === 0 ? (
                <Box padding={4} background="neutral100" hasRadius>
                  <Typography textColor="neutral600">
                    No localizable content types found. Enable i18n on your content types first.
                  </Typography>
                </Box>
              ) : (
                <Box>
                  {contentTypes.map((contentType, index) => {
                    const ctSettings = settings.contentTypes?.[contentType.uid] || {};
                    return (
                      <Box key={contentType.uid}>
                        {index > 0 && <Divider />}
                        <Box paddingTop={4} paddingBottom={4}>
                          <Flex justifyContent="space-between" alignItems="flex-start">
                            <Box>
                              <Typography variant="omega" fontWeight="bold">
                                {contentType.displayName}
                              </Typography>
                              <Typography variant="pi" textColor="neutral500">
                                {contentType.uid}
                              </Typography>
                            </Box>
                            <Flex gap={4}>
                              <Checkbox
                                checked={ctSettings.enabled || false}
                                onCheckedChange={() => handleContentTypeToggle(contentType.uid)}
                              >
                                Enable
                              </Checkbox>
                              {ctSettings.enabled && (
                                <Checkbox
                                  checked={ctSettings.autoTranslate || false}
                                  onCheckedChange={() => handleAutoTranslateToggle(contentType.uid)}
                                >
                                  Auto-translate
                                </Checkbox>
                              )}
                            </Flex>
                          </Flex>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Flex>
          </Box>
        </Flex>
      </Layouts.Content>
    </Layouts.Root>
  );
};

export default Settings;
