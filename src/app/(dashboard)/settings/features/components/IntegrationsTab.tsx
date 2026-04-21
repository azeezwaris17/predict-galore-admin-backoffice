import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Alert,
  Skeleton,
  Chip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import Image from 'next/image';
import { useIntegrations, useUpdateIntegration } from '@/features/settings';
import { Integration, UpdateIntegrationData } from '@/features/settings';
// Removed unused import: UserRole

interface TabComponentProps {
  showNotification: (message: string, severity: 'success' | 'error' | 'warning') => void;
}

type IntegrationUpdatePayload = UpdateIntegrationData;
import { createLogger } from '@/shared/api';

const logger = createLogger('Settings:IntegrationsTab');

// Skeleton Loading Component
const IntegrationsSkeleton = () => (
  <Box>
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
      <Box className="md:col-span-4">
        <Skeleton variant="text" width="60%" height={40} />
        <Skeleton variant="text" width="90%" height={60} />
      </Box>
      <Box className="md:col-span-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, index) => (
            <Skeleton key={index} variant="rectangular" height={140} sx={{ borderRadius: 2 }} />
          ))}
        </div>
      </Box>
    </div>
  </Box>
);

export const IntegrationsTab: React.FC<TabComponentProps> = ({ showNotification }) => {
  // API hooks
  const { data: integrationsData, isLoading, error, refetch } = useIntegrations();
  const updateIntegrationMutation = useUpdateIntegration();

  // State
  const integrations = integrationsData || [];
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [formData, setFormData] = useState<IntegrationUpdatePayload>({
    id: '',
    enabled: false,
    config: {},
  });
  const [showKeys, setShowKeys] = useState({ public: false, secret: false });

  // Open dialog for integration configuration
  const handleViewIntegration = (integration: Integration) => {
    setSelectedIntegration(integration);

    // Extract configuration from integration
    const config = integration.config || {};

    setFormData({
      id: integration.id,
      enabled: integration.enabled,
      config: config,
    });
    setOpenDialog(true);
  };

  // Save integration configuration
  const handleSave = async () => {
    if (!selectedIntegration) return;

    try {
      await updateIntegrationMutation.mutateAsync({
        id: selectedIntegration.id,
        enabled: formData.enabled,
        config: formData.config,
      });

      showNotification('Integration updated successfully!', 'success');
      setOpenDialog(false);
    } catch (error) {
      logger.error('Error updating integration', { error });
      const errObj = error as Record<string, unknown>;
      const data = (errObj.data as Record<string, unknown>) || errObj;
      const msg = (data.error as string) || (data.message as string) || (errObj.message as string) || 'Failed to update integration';
      showNotification(msg, 'error');
    }
  };

  // Toggle integration enabled state
  const handleIntegrationToggle = async (integration: Integration, enabled: boolean) => {
    try {
      await updateIntegrationMutation.mutateAsync({
        id: integration.id,
        enabled: enabled,
        config: integration.config,
      });

      showNotification(`${integration.name} ${enabled ? 'enabled' : 'disabled'}!`, 'success');
    } catch (error) {
      logger.error('Error toggling integration', { integrationId: integration.id, enabled, error });
      const errObj = error as Record<string, unknown>;
      const data = (errObj.data as Record<string, unknown>) || errObj;
      const msg = (data.error as string) || (data.message as string) || (errObj.message as string) || `Failed to update ${integration.name}`;
      showNotification(msg, 'error');
    }
  };

  // Handle configuration field change
  const handleConfigChange = (field: string, value: string) => {
    setFormData((prev: IntegrationUpdatePayload) => ({
      ...prev,
      config: {
        ...prev.config,
        [field]: value,
      },
    }));
  };

  // Handle enabled toggle in form
  const handleEnabledToggle = (enabled: boolean) => {
    setFormData((prev: IntegrationUpdatePayload) => ({
      ...prev,
      enabled: enabled,
    }));
  };

  return (
    <Box>
      {isLoading ? (
        <IntegrationsSkeleton />
      ) : error ? (
        <Alert severity="error" sx={{ my: 2 }}>
          Failed to load integrations. Please try again.
          <Button size="small" onClick={() => refetch()} sx={{ ml: 2 }}>
            Retry
          </Button>
        </Alert>
      ) : null}
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left Column */}
        <Box className="md:col-span-4">
          <Typography variant="h6" sx={{ mb: 2 }}>
            Integrations
          </Typography>
          <Typography variant="body2" sx={{ mb: 3 }}>
            Connect and manage third-party services. Configure credentials and enable/disable
            integrations as needed.
          </Typography>
        </Box>

        {/* Right Column */}
        <Box className="md:col-span-8">
          {error ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                Unable to load integrations. Please try again later.
              </Typography>
            </Box>
          ) : integrations.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                No integrations available
              </Typography>
            </Box>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {integrations.map((integration: Integration) => (
              <Card key={integration.id}>
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 2,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {integration.logo && (
                        <Image
                          src={integration.logo}
                          alt={integration.name}
                          width={24}
                          height={24}
                          style={{ borderRadius: '4px' }}
                        />
                      )}
                      <Typography variant="subtitle1" fontWeight="medium">
                        {integration.name}
                      </Typography>
                    </Box>
                    <Switch
                      checked={integration.enabled}
                      onChange={(e) => handleIntegrationToggle(integration, e.target.checked)}
                      color="success"
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {integration.description}
                  </Typography>

                  <Box
                    sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <Chip
                      label={integration.status}
                      size="small"
                      color={integration.status?.toLowerCase() === 'active' || integration.status === 'connected' ? 'success' : 'warning'}
                      variant="outlined"
                    />
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleViewIntegration(integration)}
                    >
                      Configure
                    </Button>
                  </Box>
                </CardContent>
              </Card>
              ))}
            </div>
          )}
        </Box>
      </div>

      {/* Configuration Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ position: 'relative', pb: 2 }}>
          <IconButton
            onClick={() => setOpenDialog(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>

          {selectedIntegration?.logo && (
            <Image
              src={selectedIntegration.logo}
              alt={selectedIntegration.name}
              width={32}
              height={32}
              style={{ marginBottom: 8, borderRadius: '4px' }}
            />
          )}
          <Typography variant="h6" component="p">{selectedIntegration?.name} Integration</Typography>
          <Typography variant="body2" color="text.secondary">
            {selectedIntegration?.description}
          </Typography>
        </DialogTitle>

        <DialogContent className="flex flex-col gap-4 pt-3">
          {/* Public Key field - check if it exists in configuration */}
          {selectedIntegration?.config?.publicKey !== undefined && (
            <TextField
              fullWidth
              label="Public Key"
              value={formData.config?.publicKey || ''}
              onChange={(e) => handleConfigChange('publicKey', e.target.value)}
              type={showKeys.public ? 'text' : 'password'}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowKeys({ ...showKeys, public: !showKeys.public })}
                      edge="end"
                    >
                      {showKeys.public ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          )}

          {/* Secret Key field - check if it exists in configuration */}
          {selectedIntegration?.config?.secretKey !== undefined && (
            <TextField
              fullWidth
              label="Secret Key"
              value={formData.config?.secretKey || ''}
              onChange={(e) => handleConfigChange('secretKey', e.target.value)}
              type={showKeys.secret ? 'text' : 'password'}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowKeys({ ...showKeys, secret: !showKeys.secret })}
                      edge="end"
                    >
                      {showKeys.secret ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          )}

          {/* Additional configuration fields */}
          {selectedIntegration?.config &&
            Object.keys(selectedIntegration.config).map((key) =>
              !['publicKey', 'secretKey'].includes(key) ? (
                <TextField
                  key={key}
                  fullWidth
                  label={key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                  value={formData.config?.[key] || ''}
                  onChange={(e) => handleConfigChange(key, e.target.value)}
                />
              ) : null
            )}

          <FormControlLabel
            control={
              <Switch
                checked={formData.enabled}
                onChange={(e) => handleEnabledToggle(e.target.checked)}
              />
            }
            label="Enable Integration"
          />
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenDialog(false)} variant="outlined">
            Cancel
          </Button>
          <Button onClick={handleSave} variant="contained">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
