import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Divider, Switch, Stack, Alert, Skeleton } from '@mui/material';
import { useProfileSettings, useUpdateNotificationSettings } from '@/features/settings';
import { UpdateNotificationSettingsData } from '@/features/settings';

interface TabComponentProps {
  showNotification: (message: string, severity: 'success' | 'error' | 'warning') => void;
}

type NotificationUpdatePayload = UpdateNotificationSettingsData;

// Notification Switch Component
interface NotificationSwitchProps {
  label: string;
  checked: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

const NotificationSwitch: React.FC<NotificationSwitchProps> = ({
  label,
  checked,
  onChange,
  disabled = false,
}) => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      py: 1,
    }}
  >
    <Typography variant="body2">{label}</Typography>
    <Switch checked={checked} onChange={onChange} color="primary" disabled={disabled} />
  </Box>
);

// Skeleton Loading Component
const NotificationsSkeleton = () => (
  <Box>
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
      <Box className="md:col-span-4">
        <Skeleton variant="text" width="60%" height={40} />
        <Skeleton variant="text" width="90%" height={60} />
        <Skeleton variant="rectangular" width={120} height={36} sx={{ mt: 2 }} />
      </Box>
      <Box className="md:col-span-8">
        {[...Array(4)].map((_, index) => (
          <Box key={index} sx={{ mb: 4 }}>
            <Skeleton variant="text" width="40%" height={30} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="80%" height={20} sx={{ mb: 2 }} />
            <Stack spacing={2}>
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} variant="rectangular" width="100%" height={40} />
              ))}
            </Stack>
            {index < 3 && <Skeleton variant="rectangular" width="100%" height={1} sx={{ mt: 4 }} />}
          </Box>
        ))}
      </Box>
    </div>
  </Box>
);

// Default notification settings (all false when null from backend)
const defaultNotificationSettings: NotificationUpdatePayload = {
  enableInApp: false,
  enableEmail: false,
  enablePush: false,
  enableInAppPred: false,
  enablePushPred: false,
  enableEmailPred: false,
  payEnableInApp: false,
  payEnablePush: false,
  payEnableEmail: false,
  secEnableInApp: false,
  secEnablePush: false,
  secEnableEmail: false,
};

export const NotificationsTab: React.FC<TabComponentProps> = ({ showNotification }) => {
  // API hooks
  const { data: profileData, isLoading, error, refetch } = useProfileSettings();
  const updateSettingsMutation = useUpdateNotificationSettings();
  const isUpdating = updateSettingsMutation.isPending;

  // State
  const [settings, setSettings] = useState<NotificationUpdatePayload>(defaultNotificationSettings);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize settings from API
  useEffect(() => {
    if (profileData?.notificationSettings) {
      const notificationSettings = profileData.notificationSettings;
      
      // Convert null values to false for UI display (switches need boolean values)
      // When all values are null, all switches should be unchecked (false)
      const normalizedSettings: NotificationUpdatePayload = {
        enableInApp: notificationSettings.enableInApp ?? false,
        enableEmail: notificationSettings.enableEmail ?? false,
        enablePush: notificationSettings.enablePush ?? false,
        enableInAppPred: notificationSettings.enableInAppPred ?? false,
        enablePushPred: notificationSettings.enablePushPred ?? false,
        enableEmailPred: notificationSettings.enableEmailPred ?? false,
        payEnableInApp: notificationSettings.payEnableInApp ?? false,
        payEnablePush: notificationSettings.payEnablePush ?? false,
        payEnableEmail: notificationSettings.payEnableEmail ?? false,
        secEnableInApp: notificationSettings.secEnableInApp ?? false,
        secEnablePush: notificationSettings.secEnablePush ?? false,
        secEnableEmail: notificationSettings.secEnableEmail ?? false,
      };
      setSettings(normalizedSettings);
      setHasChanges(false);
    } else if (profileData && !profileData.notificationSettings) {
      // If notificationSettings is null/undefined, initialize with all false
      setSettings(defaultNotificationSettings);
      setHasChanges(false);
    }
  }, [profileData]);

  // Handle toggle changes
  const handleToggleChange =
    (field: keyof NotificationUpdatePayload) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setSettings((prev: NotificationUpdatePayload) => ({ 
        ...prev, 
        [field]: event.target.checked 
      }));
      setHasChanges(true);
    };

  // Save changes
  const handleSaveChanges = async () => {
    try {
      // Send settings as-is (they're already normalized to booleans)
      await updateSettingsMutation.mutateAsync(settings);

      showNotification('Notification settings updated!', 'success');
      setHasChanges(false);
      refetch();
    } catch (error: unknown) {
      let errorMessage = 'Failed to update notifications';

      if (error && typeof error === 'object') {
        const errObj = error as Record<string, unknown>;
        const data = (errObj.data as Record<string, unknown>) || errObj;
        errorMessage =
          (data.error as string) ||
          (data.message as string) ||
          (errObj.message as string) ||
          errorMessage;
      }

      showNotification(errorMessage, 'error');
    }
  };

  if (isLoading) {
    return <NotificationsSkeleton />;
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ my: 2 }}>
          Failed to load notification settings. Please try again.
          <Button size="small" onClick={() => refetch()} sx={{ ml: 2 }}>
            Retry
          </Button>
        </Alert>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left Column */}
        <Box className="md:col-span-4">
          <Typography variant="h6" sx={{ mb: 1 }}>
            Notifications
          </Typography>
          <Typography variant="body2" sx={{ mb: 3 }}>
            Get notifications to find out what&apos;s going on when you&apos;re not online. You can
            turn them off anytime.
          </Typography>

          <Button
            variant="contained"
            onClick={handleSaveChanges}
            disabled={!hasChanges || isUpdating || !!error}
            sx={{
              minWidth: 120,
              opacity: hasChanges ? 1 : 0,
              transition: 'opacity 0.3s ease',
            }}
          >
            {isUpdating ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>

        {/* Right Column */}
        <Box className="md:col-span-8">
          {/* User Activity Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'medium', mb: 1 }}>
              User Activity
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Get updated when new users sign up, delete accounts, or upgrade to premium
            </Typography>

            <Stack spacing={2}>
              <NotificationSwitch
                label="In-app notifications"
                checked={settings.enableInApp === true}
                onChange={handleToggleChange('enableInApp')}
                disabled={isUpdating}
              />
              <NotificationSwitch
                label="Push notifications"
                checked={settings.enablePush === true}
                onChange={handleToggleChange('enablePush')}
                disabled={isUpdating}
              />
              <NotificationSwitch
                label="Email notifications"
                checked={settings.enableEmail === true}
                onChange={handleToggleChange('enableEmail')}
                disabled={isUpdating}
              />
            </Stack>
          </Box>

          <Divider sx={{ my: 4 }} />

          {/* Predictions & Posts Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'medium', mb: 1 }}>
              Predictions & Posts
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Alerts for new, edited, or deleted predictions
            </Typography>

            <Stack spacing={2}>
              <NotificationSwitch
                label="In-app prediction notifications"
                checked={settings.enableInAppPred === true}
                onChange={handleToggleChange('enableInAppPred')}
                disabled={isUpdating}
              />
              <NotificationSwitch
                label="Push prediction notifications"
                checked={settings.enablePushPred === true}
                onChange={handleToggleChange('enablePushPred')}
                disabled={isUpdating}
              />
              <NotificationSwitch
                label="Email prediction notifications"
                checked={settings.enableEmailPred === true}
                onChange={handleToggleChange('enableEmailPred')}
                disabled={isUpdating}
              />
            </Stack>
          </Box>

          <Divider sx={{ my: 4 }} />

          {/* Payments & Transactions Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'medium', mb: 1 }}>
              Payments & Transactions
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Notifications for successful and failed subscriptions payments
            </Typography>

            <Stack spacing={2}>
              <NotificationSwitch
                label="In-app payment notifications"
                checked={settings.payEnableInApp === true}
                onChange={handleToggleChange('payEnableInApp')}
                disabled={isUpdating}
              />
              <NotificationSwitch
                label="Push payment notifications"
                checked={settings.payEnablePush === true}
                onChange={handleToggleChange('payEnablePush')}
                disabled={isUpdating}
              />
              <NotificationSwitch
                label="Email payment notifications"
                checked={settings.payEnableEmail === true}
                onChange={handleToggleChange('payEnableEmail')}
                disabled={isUpdating}
              />
            </Stack>
          </Box>

          <Divider sx={{ my: 4 }} />

          {/* Security Alerts Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'medium', mb: 1 }}>
              Security Alerts
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Login attempts, suspicious activity, password reset requests
            </Typography>
            <Stack spacing={2}>
              <NotificationSwitch
                label="In-app security notifications"
                checked={settings.secEnableInApp === true}
                onChange={handleToggleChange('secEnableInApp')}
                disabled={isUpdating}
              />
              <NotificationSwitch
                label="Push security notifications"
                checked={settings.secEnablePush === true}
                onChange={handleToggleChange('secEnablePush')}
                disabled={isUpdating}
              />
              <NotificationSwitch
                label="Email security notifications"
                checked={settings.secEnableEmail === true}
                onChange={handleToggleChange('secEnableEmail')}
                disabled={isUpdating}
              />
            </Stack>
          </Box>
        </Box>
      </div>
    </Box>
  );
};
