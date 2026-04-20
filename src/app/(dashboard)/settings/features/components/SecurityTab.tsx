import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Divider,
  LinearProgress,
  Switch,
  FormControlLabel,
  InputAdornment,
  IconButton,
  Alert,
} from '@mui/material';
import {
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { createLogger } from '@/shared/api';
import { useUpdatePassword, useToggleTwoFactor, useProfileSettings } from '@/features/settings';

const logger = createLogger('Settings:Security');
import { UpdatePasswordData } from '@/features/settings';

interface TabComponentProps {
  showNotification: (message: string, severity: 'success' | 'error' | 'warning') => void;
}

type PasswordChangeData = UpdatePasswordData;

export const SecurityTab: React.FC<TabComponentProps> = ({ showNotification }) => {
  // API hooks
  const { data: profileData, isLoading: isLoadingSettings, error: settingsError } = useProfileSettings();
  const changePasswordMutation = useUpdatePassword();
  const isChangingPassword = changePasswordMutation.isPending;
  const toggleTwoFactorMutation = useToggleTwoFactor();

  // State
  const [passwordData, setPasswordData] = useState<PasswordChangeData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [error, setError] = useState<string | null>(null);

  // Initialize two-factor state from API data
  useEffect(() => {
    if (profileData) {
      // Security config comes from profile data (though it may be null)
      const twoFactorEnabled = profileData.securityConfig?.twoFactorEnabled || false;
      setTwoFactorEnabled(twoFactorEnabled);
    } else {
      // Reset to false if no data is available
      setTwoFactorEnabled(false);
    }
  }, [profileData]);

  // Handle input changes
  const handleInputChange =
    (field: keyof PasswordChangeData) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setPasswordData((prev: PasswordChangeData) => ({ ...prev, [field]: value }));
      setError(null);

      // Calculate password strength when new password changes
      if (field === 'newPassword') {
        calculatePasswordStrength(value);
      }
    };

  // Calculate password strength
  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length > 0) strength += 20;
    if (password.length >= 8) strength += 20;
    if (/[A-Z]/.test(password)) strength += 20;
    if (/[0-9]/.test(password)) strength += 20;
    if (/[^A-Za-z0-9]/.test(password)) strength += 20;
    setPasswordStrength(strength);
  };

  // Handle password change
  const handleSave = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showNotification("Passwords don't match!", 'error');
      return;
    }

    if (passwordStrength < 60) {
      showNotification('Please choose a stronger password', 'warning');
      return;
    }

    try {
      await changePasswordMutation.mutateAsync({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        confirmPassword: passwordData.confirmPassword,
      });

      showNotification('Password changed successfully!', 'success');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordStrength(0);
      setError(null);
    } catch (error: unknown) {
      let errorMessage = 'Failed to change password';

      if (error && typeof error === 'object') {
        const errObj = error as Record<string, unknown>;
        const data = (errObj.data as Record<string, unknown>) || errObj;
        errorMessage =
          (data.error as string) ||
          (data.message as string) ||
          (errObj.message as string) ||
          errorMessage;
      }

      setError(errorMessage);
      showNotification(errorMessage, 'error');
    }
  };

  // Handle 2FA toggle
  const handleTwoFactorToggle = async () => {
    try {
      await toggleTwoFactorMutation.mutateAsync(!twoFactorEnabled);

      // Two-factor toggle successful
      const newState = !twoFactorEnabled;
      setTwoFactorEnabled(newState);
      showNotification(
        `Two-factor authentication ${newState ? 'enabled' : 'disabled'}!`,
        'success'
      );
    } catch (error: unknown) {
      const errObj = error as Record<string, unknown>;
      const data = (errObj.data as Record<string, unknown>) || errObj;
      const msg =
        (data.error as string) ||
        (data.message as string) ||
        (errObj.message as string) ||
        'Failed to update two-factor authentication';
      showNotification(msg, 'error');
      logger.error('Failed to update two-factor authentication', { error });
    }
  };

  // Get color for password strength indicator
  const getPasswordStrengthColor = () => {
    if (passwordStrength < 40) return 'error';
    if (passwordStrength < 80) return 'warning';
    return 'success';
  };

  // Toggle password visibility
  const togglePasswordVisibility = (field: keyof typeof showPassword) => {
    setShowPassword((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const isFormValid =
    passwordData.currentPassword &&
    passwordData.newPassword &&
    passwordData.confirmPassword &&
    passwordData.newPassword === passwordData.confirmPassword;

  // Loading state
  if (isLoadingSettings) {
    return (
      <Box>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <Box className="md:col-span-4">
            <Typography variant="h6" sx={{ mb: 1 }}>
              Security Settings
            </Typography>
            <Typography variant="body2" sx={{ mb: 3 }}>
              Loading your security preferences...
            </Typography>
          </Box>
          <Box className="md:col-span-8">
            <Typography color="text.secondary">Loading security settings...</Typography>
          </Box>
        </div>
      </Box>
    );
  }

  // Error state
  if (settingsError) {
    return (
      <Box>
        <Alert severity="error" sx={{ my: 2 }}>
          Failed to load security settings. Please try again.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Password Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left Column */}
        <Box className="md:col-span-4">
          <Typography variant="h6" sx={{ mb: 1 }}>
            Password
          </Typography>
          <Typography variant="body2" sx={{ mb: 3 }}>
            Please enter your current password to change your password.
          </Typography>
          <Button
            variant="contained"
            sx={{ mb: 2 }}
            onClick={handleSave}
            disabled={isChangingPassword || !isFormValid}
          >
            {isChangingPassword ? 'Updating...' : 'Save Changes'}
          </Button>
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </Box>

        {/* Right Column - Form Fields */}
        <Box className="md:col-span-8 flex flex-col gap-3">
          <Box sx={{ mb: 3 }}>
            <TextField
              label="Current Password"
              type={showPassword.current ? 'text' : 'password'}
              value={passwordData.currentPassword}
              onChange={handleInputChange('currentPassword')}
              fullWidth
              disabled={isChangingPassword}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => togglePasswordVisibility('current')} edge="end">
                      {showPassword.current ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <TextField
              label="New Password"
              type={showPassword.new ? 'text' : 'password'}
              value={passwordData.newPassword}
              onChange={handleInputChange('newPassword')}
              fullWidth
              disabled={isChangingPassword}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => togglePasswordVisibility('new')} edge="end">
                      {showPassword.new ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            {passwordData.newPassword && (
              <>
                <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                  Password strength
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={passwordStrength}
                  color={getPasswordStrengthColor()}
                  sx={{ height: 6, borderRadius: 3, mt: 1 }}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 0.5, display: 'block' }}
                >
                  {passwordStrength < 40 ? 'Weak' : passwordStrength < 80 ? 'Good' : 'Strong'}
                </Typography>
              </>
            )}
          </Box>

          <Box sx={{ mb: 3 }}>
            <TextField
              label="Confirm Password"
              type={showPassword.confirm ? 'text' : 'password'}
              value={passwordData.confirmPassword}
              onChange={handleInputChange('confirmPassword')}
              fullWidth
              disabled={isChangingPassword}
              error={
                passwordData.confirmPassword !== '' &&
                passwordData.newPassword !== passwordData.confirmPassword
              }
              helperText={
                passwordData.confirmPassword !== '' &&
                passwordData.newPassword !== passwordData.confirmPassword
                  ? "Passwords don't match"
                  : ''
              }
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => togglePasswordVisibility('confirm')} edge="end">
                      {showPassword.confirm ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </Box>
      </div>

      <Divider sx={{ my: 4 }} />

      {/* Two Factor Authentication Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <Box className="md:col-span-4">
          <Typography variant="h6" sx={{ mb: 2 }}>
            Two Factor Authentication
          </Typography>
          <Typography variant="body2" sx={{ mb: 3 }}>
            Add an extra layer of security with two-factor authentication.
          </Typography>
        </Box>

        <Box className="md:col-span-8">
          <FormControlLabel
            control={
              <Switch
                checked={twoFactorEnabled}
                onChange={handleTwoFactorToggle}
                color="primary"
                disabled={isChangingPassword || toggleTwoFactorMutation.isPending}
              />
            }
            label={twoFactorEnabled ? 'Enabled' : 'Disabled'}
            sx={{ mb: 2 }}
          />
          <Typography variant="body2" color="text.secondary">
            When enabled, you&apos;ll be required to enter both your password and a verification
            code.
          </Typography>
        </Box>
      </div>
    </Box>
  );
};
