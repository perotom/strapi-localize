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
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await get('/strapi-localize/settings');
      setSettings(response.data || response || {});
    } catch (error) {
      console.error('Failed to load settings:', error);
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
                    <Typography textColor={connectionStatus ? 'success600' : 'danger600'}>
                      {connectionStatus ? 'Connected' : 'Connection failed'}
                    </Typography>
                  )}
                </Flex>
              </Flex>
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
