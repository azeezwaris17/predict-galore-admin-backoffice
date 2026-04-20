import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Divider,
  CircularProgress,
  Alert,
  Skeleton,
} from '@mui/material';
import TimezoneSelect from 'react-timezone-select';
import { useProfileSettings, useUpdateProfile } from '@/features/settings';
import type { UpdateProfileData } from '@/features/settings';

interface TabComponentProps {
  showNotification: (message: string, severity: 'success' | 'error' | 'warning') => void;
}

interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  timezone: string;
}

type UpdateProfilePayload = UpdateProfileData;

// Skeleton Loading Component
const ProfileSkeleton = () => (
  <Box>
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
      <Box className="md:col-span-4">
        <Skeleton variant="text" width="60%" height={40} />
        <Skeleton variant="text" width="90%" height={24} />
      </Box>
      <Box className="md:col-span-8">
        <Skeleton variant="rectangular" width="100%" height={56} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" width="100%" height={56} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" width="100%" height={56} />
      </Box>
    </div>
    <Divider sx={{ my: 4 }} />
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
      <Box className="md:col-span-4">
        <Skeleton variant="text" width="60%" height={40} />
      </Box>
      <Box className="md:col-span-8">
        <Skeleton variant="rectangular" width="100%" height={56} />
      </Box>
    </div>
  </Box>
);

export const ProfileTab: React.FC<TabComponentProps> = ({ showNotification }) => {
  // API hooks
  const { data: profileResponse, isLoading, error, refetch } = useProfileSettings();
  const updateProfileMutation = useUpdateProfile();
  const isUpdating = updateProfileMutation.isPending;

  // State
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  const [originalData, setOriginalData] = useState<ProfileFormData>({ ...formData });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize form with profile data
  useEffect(() => {
    if (profileResponse) {
      // Profile data structure from backend: UserProfile with basicDetails nested object
      const basicDetails = profileResponse.basicDetails;

      if (basicDetails) {
        const newFormData: ProfileFormData = {
          firstName: basicDetails.firstName || '',
          lastName: basicDetails.lastName || '',
          email: basicDetails.email || '',
          phone: basicDetails.phoneNumber || '',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Not provided in current API
        };

        setFormData(newFormData);
        setOriginalData(newFormData);
      }
    }
  }, [profileResponse]);

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
      setFormData((prev: ProfileFormData) => ({ ...prev, [name]: value }));
    setErrorMessage(null);
  };

  // Handle timezone change
  const handleTimezoneChange = (timezone: string | { value: string }) => {
    const tzString = typeof timezone === 'string' ? timezone : timezone.value;
      setFormData((prev: ProfileFormData) => ({ ...prev, timezone: tzString }));
    setErrorMessage(null);
  };

  // Check if form has changes
  const hasChanges = () => {
    return (
      formData.firstName !== originalData.firstName ||
      formData.lastName !== originalData.lastName ||
      formData.timezone !== originalData.timezone ||
      formData.phone !== originalData.phone
    );
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setErrorMessage('First name and last name are required');
      return;
    }

    const payload: UpdateProfilePayload = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      timezone: formData.timezone,
      phone: formData.phone?.trim() || '',
    };

    try {
      await updateProfileMutation.mutateAsync(payload);

      showNotification('Profile updated successfully!', 'success');
      setOriginalData(formData);
      setIsEditing(false);
      setErrorMessage(null);
      refetch();
    } catch (err: unknown) {
      const errObj = err as Record<string, unknown>;
      const data = (errObj.data as Record<string, unknown>) || {};
      const errorMsg =
        (data.error as string) ||
        (data.message as string) ||
        (errObj.message as string) ||
        'Failed to update profile. Please try again.';
      setErrorMessage(errorMsg);
    }
  };

  // Loading state
  if (isLoading) return <ProfileSkeleton />;

  // Error state
  if (error) {
    return (
      <Alert severity="error" sx={{ my: 2 }}>
        Failed to load profile data: {error instanceof Error ? error.message : 'Unknown error'}
        <Button size="small" onClick={() => refetch()} sx={{ ml: 2 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  // Show message if profile data is not available (but still render form)
  const hasProfileData = profileResponse && profileResponse.basicDetails;

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {!hasProfileData && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Profile data is not available. Please try refreshing.
          <Button size="small" onClick={() => refetch()} sx={{ ml: 2 }}>
            Refresh
          </Button>
        </Alert>
      )}

      {/* Personal Information */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <Box className="md:col-span-4">
          <Typography variant="h6" gutterBottom>
            Personal Information
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Update your personal details here.
          </Typography>
        </Box>

        <Box className="md:col-span-8">
          <Box display="flex" gap={2} mb={3}>
            <TextField
              name="firstName"
              label="First name"
              value={formData.firstName}
              onChange={handleChange}
              fullWidth
              disabled={!isEditing || isUpdating}
              required
              error={!!errorMessage && !formData.firstName.trim()}
              helperText={errorMessage && !formData.firstName.trim() ? 'Required' : ''}
            />
            <TextField
              name="lastName"
              label="Last name"
              value={formData.lastName}
              onChange={handleChange}
              fullWidth
              disabled={!isEditing || isUpdating}
              required
              error={!!errorMessage && !formData.lastName.trim()}
              helperText={errorMessage && !formData.lastName.trim() ? 'Required' : ''}
            />
          </Box>

          <TextField
            name="email"
            label="Email Address"
            value={formData.email}
            fullWidth
            disabled
            sx={{ mb: 3 }}
          />

          <TextField
            name="phone"
            label="Phone Number"
            value={formData.phone}
            onChange={handleChange}
            fullWidth
            disabled={!isEditing || isUpdating}
            placeholder="+1 (555) 123-4567"
          />
        </Box>
      </div>

      <Divider sx={{ my: 4 }} />

      {/* Timezone */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <Box className="md:col-span-4">
          <Typography variant="h6" gutterBottom>
            Timezone
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Adjust the time zone to match your local time.
          </Typography>
        </Box>

        <Box className="md:col-span-8">
          <TimezoneSelect
            value={formData.timezone}
            onChange={handleTimezoneChange}
            labelStyle="original"
            menuPosition="fixed"
            isDisabled={!isEditing || isUpdating}
            styles={{
              control: (base) => ({
                ...base,
                minHeight: '56px',
                borderColor: 'rgba(0, 0, 0, 0.23)',
                '&:hover': { borderColor: 'rgba(0, 0, 0, 0.87)' },
                backgroundColor: !isEditing ? 'rgba(0, 0, 0, 0.06)' : 'inherit',
              }),
            }}
          />
        </Box>
      </div>

      {/* Actions */}
      <Box mt={4} display="flex" justifyContent="flex-end" gap={2}>
        {errorMessage && (
          <Alert severity="error" sx={{ mr: 2 }}>
            {errorMessage}
          </Alert>
        )}

        {isEditing ? (
          <>
            <Button
              variant="outlined"
              onClick={() => {
                setIsEditing(false);
                setFormData(originalData);
                setErrorMessage(null);
              }}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              type="submit"
              disabled={isUpdating || !hasChanges()}
              startIcon={isUpdating ? <CircularProgress size={20} /> : undefined}
            >
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </>
        ) : (
          <Button variant="contained" onClick={() => setIsEditing(true)}>
            Edit Profile
          </Button>
        )}
      </Box>
    </Box>
  );
};
