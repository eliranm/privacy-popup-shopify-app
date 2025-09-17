'use client';

import { 
  Page, 
  Card, 
  Stack, 
  Text, 
  TextField, 
  Select,
  RangeSlider,
  Checkbox,
  Button,
  Banner,
  Layout,
  Box,
  ColorPicker,
  Popover,
  ButtonGroup,
  Toast,
  Frame
} from '@shopify/polaris';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';

interface PopupSettings {
  message: string;
  linkUrl: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  maxWidth: number;
  padding: number;
  zIndex: number;
  dismissible: boolean;
  bgColor: string;
  textColor: string;
  linkColor: string;
}

interface SettingsData {
  popupSettings: PopupSettings;
  hasActiveSubscription: boolean;
  restrictedFeatures?: string[];
}

const defaultSettings: PopupSettings = {
  message: 'We use cookies to enhance your browsing experience and analyze our traffic. By continuing to use our site, you consent to our use of cookies.',
  linkUrl: '/pages/privacy-policy',
  position: 'bottom',
  maxWidth: 400,
  padding: 20,
  zIndex: 9999,
  dismissible: true,
  bgColor: '#ffffff',
  textColor: '#333333',
  linkColor: '#007ace',
};

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PopupSettings>(defaultSettings);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [restrictedFeatures, setRestrictedFeatures] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ content: string; error?: boolean } | null>(null);
  const [colorPickerActive, setColorPickerActive] = useState<string | null>(null);
  
  const searchParams = useSearchParams();
  const shop = searchParams?.get('shop') || '';
  const host = searchParams?.get('host') || '';

  useEffect(() => {
    if (shop) {
      fetchSettings();
    }
  }, [shop]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/settings?shop=${shop}`);
      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }

      const data = await response.json();
      const settingsData: SettingsData = data.data;
      
      setSettings(settingsData.popupSettings || defaultSettings);
      setHasActiveSubscription(settingsData.hasActiveSubscription);
      setRestrictedFeatures(settingsData.restrictedFeatures || []);
    } catch (err) {
      console.error('Settings fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`/api/settings?shop=${shop}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save settings');
      }

      // Update settings with response data (in case of restrictions)
      setSettings(data.data);
      setRestrictedFeatures(data.restrictedFeatures || []);

      setToast({
        content: data.warning || 'Settings saved successfully',
        error: !!data.warning,
      });

      if (data.warning) {
        // Show upgrade prompt for restricted features
        setTimeout(() => {
          setToast({
            content: 'Upgrade to unlock advanced styling options',
            error: false,
          });
        }, 3000);
      }
    } catch (err) {
      console.error('Settings save error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save settings');
      setToast({
        content: 'Failed to save settings',
        error: true,
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = () => {
    // Open store in new window for preview
    window.open(`https://${shop}`, '_blank');
  };

  const handleReset = () => {
    setSettings(defaultSettings);
  };

  const openThemeEditor = () => {
    const themeEditorUrl = `https://${shop}/admin/themes`;
    window.open(themeEditorUrl, '_blank');
  };

  const toggleColorPicker = useCallback((colorType: string | null) => {
    setColorPickerActive(colorType);
  }, []);

  const handleColorChange = useCallback((colorType: 'bgColor' | 'textColor' | 'linkColor', color: string) => {
    setSettings(prev => ({
      ...prev,
      [colorType]: color,
    }));
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  if (loading) {
    return <LoadingSpinner />;
  }

  const isColorRestricted = restrictedFeatures.includes('custom_colors');
  const positionOptions = [
    { label: 'Top', value: 'top' },
    { label: 'Bottom', value: 'bottom' },
    { label: 'Left', value: 'left' },
    { label: 'Right', value: 'right' },
  ];

  const toastMarkup = toast ? (
    <Toast
      content={toast.content}
      error={toast.error}
      onDismiss={dismissToast}
    />
  ) : null;

  return (
    <Frame>
      <Page
        title="Popup Settings"
        subtitle="Customize your privacy popup appearance and behavior"
        primaryAction={{
          content: 'Save Settings',
          onAction: handleSave,
          loading: saving,
        }}
        secondaryActions={[
          {
            content: 'Preview Store',
            onAction: handlePreview,
            external: true,
          },
          {
            content: 'Reset to Defaults',
            onAction: handleReset,
            destructive: true,
          },
        ]}
      >
        <Layout>
          <Layout.Section>
            <Stack vertical spacing="loose">
              {error && (
                <Banner status="critical" title="Error">
                  <p>{error}</p>
                  <Button onClick={fetchSettings} outline>
                    Retry
                  </Button>
                </Banner>
              )}

              {!hasActiveSubscription && (
                <Banner
                  title="Upgrade to Unlock Advanced Features"
                  status="info"
                  action={{
                    content: 'View Plans',
                    url: `/billing?shop=${shop}&host=${host}`,
                  }}
                >
                  <p>
                    Get access to custom colors, advanced styling options, and priority support.
                  </p>
                </Banner>
              )}

              {/* Content Settings */}
              <Card>
                <Box padding="4">
                  <Stack vertical spacing="loose">
                    <Text variant="headingMd" as="h3">
                      Content
                    </Text>
                    
                    <TextField
                      label="Privacy Message"
                      value={settings.message}
                      onChange={(value) => setSettings(prev => ({ ...prev, message: value }))}
                      multiline={4}
                      helpText="The message displayed in your privacy popup"
                      showCharacterCount
                      maxLength={1000}
                    />
                    
                    <TextField
                      label="Privacy Policy Link"
                      value={settings.linkUrl}
                      onChange={(value) => setSettings(prev => ({ ...prev, linkUrl: value }))}
                      placeholder="/pages/privacy-policy"
                      helpText="Link to your privacy policy page (absolute URL or relative path)"
                    />
                  </Stack>
                </Box>
              </Card>

              {/* Position & Behavior */}
              <Card>
                <Box padding="4">
                  <Stack vertical spacing="loose">
                    <Text variant="headingMd" as="h3">
                      Position & Behavior
                    </Text>
                    
                    <Select
                      label="Position"
                      options={positionOptions}
                      value={settings.position}
                      onChange={(value) => setSettings(prev => ({ 
                        ...prev, 
                        position: value as PopupSettings['position'] 
                      }))}
                      helpText="Where to position the popup on screen"
                    />
                    
                    <RangeSlider
                      label={`Maximum Width: ${settings.maxWidth}px`}
                      value={settings.maxWidth}
                      onChange={(value) => setSettings(prev => ({ ...prev, maxWidth: value }))}
                      min={200}
                      max={800}
                      step={50}
                      helpText="Maximum width of the popup"
                    />
                    
                    <RangeSlider
                      label={`Padding: ${settings.padding}px`}
                      value={settings.padding}
                      onChange={(value) => setSettings(prev => ({ ...prev, padding: value }))}
                      min={10}
                      max={50}
                      step={5}
                      helpText="Internal padding of the popup"
                    />
                    
                    <TextField
                      label="Z-Index"
                      type="number"
                      value={settings.zIndex.toString()}
                      onChange={(value) => setSettings(prev => ({ 
                        ...prev, 
                        zIndex: parseInt(value) || 9999 
                      }))}
                      helpText="Stacking order (higher numbers appear on top)"
                    />
                    
                    <Checkbox
                      label="Allow users to dismiss popup permanently"
                      checked={settings.dismissible}
                      onChange={(value) => setSettings(prev => ({ ...prev, dismissible: value }))}
                      helpText="Users can close the popup and it won't show again"
                    />
                  </Stack>
                </Box>
              </Card>

              {/* Styling */}
              <Card>
                <Box padding="4">
                  <Stack vertical spacing="loose">
                    <Stack distribution="equalSpacing" alignment="center">
                      <Text variant="headingMd" as="h3">
                        Styling
                      </Text>
                      {isColorRestricted && (
                        <Badge status="attention">Premium Feature</Badge>
                      )}
                    </Stack>
                    
                    {isColorRestricted && (
                      <Banner status="info" title="Premium Feature">
                        <p>Custom colors are available with a premium subscription.</p>
                      </Banner>
                    )}
                    
                    <Stack distribution="equalSpacing">
                      <Stack vertical spacing="tight">
                        <Text variant="bodyMd" as="p">
                          Background Color
                        </Text>
                        <Popover
                          active={colorPickerActive === 'bgColor'}
                          activator={
                            <Button
                              onClick={() => toggleColorPicker('bgColor')}
                              disabled={isColorRestricted}
                            >
                              <div
                                style={{
                                  width: 20,
                                  height: 20,
                                  backgroundColor: settings.bgColor,
                                  border: '1px solid #ccc',
                                  marginRight: 8,
                                  display: 'inline-block',
                                }}
                              />
                              {settings.bgColor}
                            </Button>
                          }
                          onClose={() => toggleColorPicker(null)}
                        >
                          <ColorPicker
                            color={settings.bgColor}
                            onChange={(color) => handleColorChange('bgColor', color)}
                          />
                        </Popover>
                      </Stack>
                      
                      <Stack vertical spacing="tight">
                        <Text variant="bodyMd" as="p">
                          Text Color
                        </Text>
                        <Popover
                          active={colorPickerActive === 'textColor'}
                          activator={
                            <Button
                              onClick={() => toggleColorPicker('textColor')}
                              disabled={isColorRestricted}
                            >
                              <div
                                style={{
                                  width: 20,
                                  height: 20,
                                  backgroundColor: settings.textColor,
                                  border: '1px solid #ccc',
                                  marginRight: 8,
                                  display: 'inline-block',
                                }}
                              />
                              {settings.textColor}
                            </Button>
                          }
                          onClose={() => toggleColorPicker(null)}
                        >
                          <ColorPicker
                            color={settings.textColor}
                            onChange={(color) => handleColorChange('textColor', color)}
                          />
                        </Popover>
                      </Stack>
                      
                      <Stack vertical spacing="tight">
                        <Text variant="bodyMd" as="p">
                          Link Color
                        </Text>
                        <Popover
                          active={colorPickerActive === 'linkColor'}
                          activator={
                            <Button
                              onClick={() => toggleColorPicker('linkColor')}
                              disabled={isColorRestricted}
                            >
                              <div
                                style={{
                                  width: 20,
                                  height: 20,
                                  backgroundColor: settings.linkColor,
                                  border: '1px solid #ccc',
                                  marginRight: 8,
                                  display: 'inline-block',
                                }}
                              />
                              {settings.linkColor}
                            </Button>
                          }
                          onClose={() => toggleColorPicker(null)}
                        >
                          <ColorPicker
                            color={settings.linkColor}
                            onChange={(color) => handleColorChange('linkColor', color)}
                          />
                        </Popover>
                      </Stack>
                    </Stack>
                  </Stack>
                </Box>
              </Card>
            </Stack>
          </Layout.Section>

          <Layout.Section secondary>
            <Stack vertical spacing="loose">
              {/* Preview */}
              <Card>
                <Box padding="4">
                  <Stack vertical spacing="loose">
                    <Text variant="headingMd" as="h3">
                      Preview
                    </Text>
                    
                    <Box
                      padding="4"
                      background="surface-neutral"
                      borderRadius="2"
                      minHeight="200px"
                      position="relative"
                    >
                      <div
                        style={{
                          position: 'absolute',
                          [settings.position === 'top' ? 'top' : 
                           settings.position === 'bottom' ? 'bottom' : 
                           settings.position]: '10px',
                          [settings.position === 'left' ? 'left' : 
                           settings.position === 'right' ? 'right' : 'left']: 
                           settings.position === 'left' || settings.position === 'right' ? '10px' : '50%',
                          transform: settings.position === 'top' || settings.position === 'bottom' ? 
                                   'translateX(-50%)' : 'none',
                          maxWidth: `${settings.maxWidth}px`,
                          padding: `${settings.padding}px`,
                          backgroundColor: settings.bgColor,
                          color: settings.textColor,
                          borderRadius: '8px',
                          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                          border: '1px solid rgba(0, 0, 0, 0.1)',
                          fontSize: '14px',
                          lineHeight: '1.5',
                        }}
                      >
                        <div style={{ marginBottom: '16px' }}>
                          {settings.message}
                          {settings.linkUrl && (
                            <>
                              {' '}
                              <a
                                href="#"
                                style={{
                                  color: settings.linkColor,
                                  textDecoration: 'underline',
                                }}
                                onClick={(e) => e.preventDefault()}
                              >
                                Learn more
                              </a>
                            </>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                          <button
                            style={{
                              background: settings.linkColor,
                              color: 'white',
                              border: 'none',
                              padding: '8px 16px',
                              borderRadius: '4px',
                              fontSize: '13px',
                              cursor: 'pointer',
                            }}
                          >
                            Accept
                          </button>
                          {settings.dismissible && (
                            <button
                              style={{
                                background: 'transparent',
                                color: settings.textColor,
                                border: '1px solid rgba(0, 0, 0, 0.2)',
                                padding: '8px 16px',
                                borderRadius: '4px',
                                fontSize: '13px',
                                cursor: 'pointer',
                              }}
                            >
                              Dismiss
                            </button>
                          )}
                        </div>
                      </div>
                    </Box>
                    
                    <Text variant="bodySm" color="subdued">
                      This is how your popup will appear on your store
                    </Text>
                  </Stack>
                </Box>
              </Card>

              {/* Quick Actions */}
              <Card>
                <Box padding="4">
                  <Stack vertical spacing="loose">
                    <Text variant="headingMd" as="h3">
                      Quick Actions
                    </Text>
                    
                    <Stack vertical spacing="tight">
                      <Button
                        onAction={openThemeEditor}
                        size="large"
                        fullWidth
                        outline
                        external
                      >
                        Open Theme Editor
                      </Button>
                      
                      <Button
                        onAction={handlePreview}
                        size="large"
                        fullWidth
                        outline
                        external
                      >
                        Preview Store
                      </Button>
                      
                      {!hasActiveSubscription && (
                        <Button
                          url={`/billing?shop=${shop}&host=${host}`}
                          size="large"
                          fullWidth
                          primary
                        >
                          Upgrade for More Features
                        </Button>
                      )}
                    </Stack>
                  </Stack>
                </Box>
              </Card>

              {/* Help */}
              <Card>
                <Box padding="4">
                  <Stack vertical spacing="loose">
                    <Text variant="headingMd" as="h3">
                      Need Help?
                    </Text>
                    
                    <Stack vertical spacing="tight">
                      <Text variant="bodyMd">
                        • Make sure to enable the app embed in your theme editor
                      </Text>
                      <Text variant="bodyMd">
                        • Test your popup by visiting your store in an incognito window
                      </Text>
                      <Text variant="bodyMd">
                        • Use clear, concise messaging for better user experience
                      </Text>
                    </Stack>
                    
                    <Link external url="mailto:support@example.com">
                      Contact Support
                    </Link>
                  </Stack>
                </Box>
              </Card>
            </Stack>
          </Layout.Section>
        </Layout>
      </Page>
      {toastMarkup}
    </Frame>
  );
}
