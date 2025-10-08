import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  Loader,
  Grid,
  Card,
  CardHeader,
  CardBody,
  CardContent,
  Select,
  Option,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Checkbox,
  Flex,
} from '@strapi/design-system';
import { Globe } from '@strapi/icons';
import { useFetchClient, useNotification } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';

const HomePage = () => {
  const { formatMessage } = useIntl();
  const { get, post } = useFetchClient();
  const toggleNotification = useNotification();

  const [contentTypes, setContentTypes] = useState([]);
  const [selectedContentType, setSelectedContentType] = useState('');
  const [entities, setEntities] = useState([]);
  const [selectedEntities, setSelectedEntities] = useState([]);
  const [targetLocale, setTargetLocale] = useState('');
  const [availableLocales, setAvailableLocales] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    fetchContentTypes();
    fetchLocales();
  }, []);

  useEffect(() => {
    if (selectedContentType) {
      fetchEntities();
    }
  }, [selectedContentType]);

  const fetchContentTypes = async () => {
    try {
      const data = await get('/strapi-localize/content-types');
      const types = data.data || data;
      setContentTypes(types);
      if (types.length > 0) {
        setSelectedContentType(types[0].uid);
      }
    } catch (error) {
      toggleNotification({
        type: 'warning',
        message: 'Failed to load content types',
      });
    }
  };

  const fetchLocales = async () => {
    try {
      const response = await get('/i18n/locales');
      const locales = response.data || response;
      setAvailableLocales(locales.filter(l => l.code !== 'en'));
      if (locales.length > 1) {
        setTargetLocale(locales.find(l => l.code !== 'en')?.code || '');
      }
    } catch (error) {
      console.error('Failed to fetch locales:', error);
    }
  };

  const fetchEntities = async () => {
    if (!selectedContentType) return;

    setIsLoading(true);
    try {
      const endpoint = selectedContentType.replace('api::', '').replace('.', '/');
      const response = await get(`/content-manager/collection-types/${selectedContentType}?locale=en`);
      const data = response.data || response;
      setEntities(data.results || []);
      setSelectedEntities([]);
    } catch (error) {
      toggleNotification({
        type: 'warning',
        message: 'Failed to load content',
      });
      setEntities([]);
    }
    setIsLoading(false);
  };

  const handleTranslate = async () => {
    if (!selectedEntities.length || !targetLocale) {
      toggleNotification({
        type: 'warning',
        message: 'Please select content and target language',
      });
      return;
    }

    setIsTranslating(true);
    try {
      await post('/strapi-localize/translate-batch', {
        ids: selectedEntities,
        model: selectedContentType,
        targetLocale,
        sourceLocale: 'en',
      });

      toggleNotification({
        type: 'success',
        message: `Successfully translated ${selectedEntities.length} items`,
      });

      setSelectedEntities([]);
      fetchEntities();
    } catch (error) {
      toggleNotification({
        type: 'warning',
        message: 'Translation failed',
      });
    }
    setIsTranslating(false);
  };

  const handleSelectAll = () => {
    if (selectedEntities.length === entities.length) {
      setSelectedEntities([]);
    } else {
      setSelectedEntities(entities.map(e => e.id));
    }
  };

  const handleSelectEntity = (id) => {
    if (selectedEntities.includes(id)) {
      setSelectedEntities(selectedEntities.filter(e => e !== id));
    } else {
      setSelectedEntities([...selectedEntities, id]);
    }
  };

  return (
    <Box padding={8}>
      <Flex justifyContent="space-between" alignItems="center" marginBottom={6}>
        <Typography variant="alpha">
          <Flex gap={2} alignItems="center">
            <Globe />
            DeepL Translate
          </Flex>
        </Typography>
      </Flex>

      <Grid gap={6}>
        <Card>
          <CardHeader>
            <Typography variant="beta">Batch Translation</Typography>
          </CardHeader>
          <CardBody>
            <CardContent>
              <Flex gap={4} marginBottom={4}>
                <Box flex="1">
                  <Select
                    label="Content Type"
                    value={selectedContentType}
                    onChange={setSelectedContentType}
                  >
                    {contentTypes.map((ct) => (
                      <Option key={ct.uid} value={ct.uid}>
                        {ct.displayName}
                      </Option>
                    ))}
                  </Select>
                </Box>

                <Box flex="1">
                  <Select
                    label="Target Language"
                    value={targetLocale}
                    onChange={setTargetLocale}
                  >
                    {availableLocales.map((locale) => (
                      <Option key={locale.code} value={locale.code}>
                        {locale.name} ({locale.code})
                      </Option>
                    ))}
                  </Select>
                </Box>

                <Box alignSelf="flex-end">
                  <Button
                    onClick={handleTranslate}
                    loading={isTranslating}
                    disabled={!selectedEntities.length || !targetLocale}
                  >
                    Translate Selected ({selectedEntities.length})
                  </Button>
                </Box>
              </Flex>

              {isLoading ? (
                <Loader>Loading content...</Loader>
              ) : entities.length === 0 ? (
                <Alert variant="default" title="No content found">
                  No content available for translation in this content type
                </Alert>
              ) : (
                <Table>
                  <Thead>
                    <Tr>
                      <Th>
                        <Checkbox
                          checked={selectedEntities.length === entities.length}
                          indeterminate={
                            selectedEntities.length > 0 &&
                            selectedEntities.length < entities.length
                          }
                          onChange={handleSelectAll}
                        />
                      </Th>
                      <Th>ID</Th>
                      <Th>Title</Th>
                      <Th>Status</Th>
                      <Th>Updated</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {entities.map((entity) => (
                      <Tr key={entity.id}>
                        <Td>
                          <Checkbox
                            checked={selectedEntities.includes(entity.id)}
                            onChange={() => handleSelectEntity(entity.id)}
                          />
                        </Td>
                        <Td>{entity.id}</Td>
                        <Td>
                          {entity.title ||
                            entity.name ||
                            entity.slug ||
                            `Entry ${entity.id}`}
                        </Td>
                        <Td>
                          {entity.publishedAt ? 'Published' : 'Draft'}
                        </Td>
                        <Td>
                          {new Date(entity.updatedAt).toLocaleDateString()}
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              )}
            </CardContent>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <Typography variant="beta">Quick Actions</Typography>
          </CardHeader>
          <CardBody>
            <CardContent>
              <Grid gap={4}>
                <Alert variant="default" title="Auto-Translation Status">
                  Auto-translation can be configured in the Settings page for
                  each content type
                </Alert>

                <Typography variant="omega">
                  This plugin automatically translates your content using DeepL
                  API. Configure your API key and content type settings to get
                  started.
                </Typography>
              </Grid>
            </CardContent>
          </CardBody>
        </Card>
      </Grid>
    </Box>
  );
};

export default HomePage;