/**
 * User Detail Page
 * Shows detailed information about a single user with edit/delete functionality
 */

'use client';

import { useCallback, memo, useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  Divider,
  Avatar,
  Breadcrumbs,
  Link,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  Alert,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { designTokens } from '@/shared/styles/tokens';
import { useUser, useDeleteUser, useUpdateUserStatus, generateUserInitials } from '@/features/users';
import { useQueryClient } from '@tanstack/react-query';
import { DeleteConfirmationDialog } from '@/shared/components/DeleteConfirmationDialog';
import { SuccessDialog } from '@/shared/components/SuccessDialog';

function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useUser(userId);
  const deleteUser = useDeleteUser();
  const updateUserStatus = useUpdateUserStatus();
  
  // Editing state - Note: API only supports status updates, not full user updates
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<{ isActive?: boolean } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [editSuccessDialogOpen, setEditSuccessDialogOpen] = useState(false);
  const [deleteSuccessDialogOpen, setDeleteSuccessDialogOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Initialize edited data when editing starts
  // Note: API only supports status updates, so we only track isActive changes
  useEffect(() => {
    if (user && isEditing && !editedData) {
      setTimeout(() => {
        const initialData = {
          isActive: user.isActive,
        };
        setEditedData(initialData);
      }, 0);
    }
  }, [user, isEditing, editedData]);

  const handleBack = useCallback(() => {
    if (isEditing && hasChanges) {
      setSaveDialogOpen(true);
    } else {
      router.push('/users');
    }
  }, [isEditing, hasChanges, router]);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
    setHasChanges(false);
  }, []);

  const handleCancelEdit = useCallback(() => {
    if (hasChanges) {
      setSaveDialogOpen(true);
    } else {
      setIsEditing(false);
      setEditedData(null);
      setHasChanges(false);
    }
  }, [hasChanges]);

  const handleSave = useCallback(() => {
    setSaveDialogOpen(true);
  }, []);

  const handleConfirmSave = useCallback(async () => {
    if (!editedData || !user) return;
    
    try {
      // API only supports status updates via status endpoint
      // Determine action based on isActive change
      if (editedData.isActive !== undefined && editedData.isActive !== user.isActive) {
        const action = editedData.isActive ? 'activate' : 'deactivate';
        await updateUserStatus.mutateAsync({ userId: user.id, action });
      }
      
      setIsEditing(false);
      setEditedData(null);
      setHasChanges(false);
      setSaveDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      // Show success dialog
      setEditSuccessDialogOpen(true);
    } catch (error: unknown) {
      console.error('Failed to update user:', error);
      const errObj = error as Record<string, unknown>;
      const data = (errObj.data as Record<string, unknown>) || errObj;
      const msg =
        (data.error as string) ||
        (data.message as string) ||
        (errObj.message as string) ||
        'Failed to update user. Please try again.';
      setActionError(msg);
      setSaveDialogOpen(false);
    }
  }, [editedData, user, updateUserStatus, userId, queryClient]);

  const handleDiscardChanges = useCallback(() => {
    setIsEditing(false);
    setEditedData(null);
    setHasChanges(false);
    setSaveDialogOpen(false);
  }, []);

  const handleDeleteClick = useCallback(() => {
    setDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    try {
      await deleteUser.mutateAsync(userId);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDeleteDialogOpen(false);
      // Show success dialog
      setDeleteSuccessDialogOpen(true);
    } catch (error) {
      console.error('Failed to delete user:', error);
      const errObj = error as Record<string, unknown>;
      const data = (errObj.data as Record<string, unknown>) || errObj;
      const msg =
        (data.error as string) ||
        (data.message as string) ||
        (errObj.message as string) ||
        'Failed to delete user. Please try again.';
      setActionError(msg);
      setDeleteDialogOpen(false);
    }
  }, [deleteUser, userId, queryClient]);

  const handleEditSuccessClose = useCallback(() => {
    setEditSuccessDialogOpen(false);
  }, []);

  const handleDeleteSuccessClose = useCallback(() => {
    setDeleteSuccessDialogOpen(false);
    // Navigate back to users list after closing success dialog
    router.push('/users');
  }, [router]);

  const handleFieldChange = useCallback((field: string, value: unknown) => {
    if (!editedData) return;
    setEditedData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setHasChanges(true);
  }, [editedData]);

  if (isLoading) {
    return (
      <Box
        sx={{
          width: '100%',
          minHeight: '100vh',
          px: { xs: 2, sm: 3, md: 4 },
          py: designTokens.spacing.xl,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error || !user) {
    return (
      <Box
        sx={{
          width: '100%',
          minHeight: '100vh',
          px: { xs: 2, sm: 3, md: 4 },
          py: designTokens.spacing.xl,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography variant="h6" color="error">
          Failed to load user. Please try again.
        </Typography>
      </Box>
    );
  }

  const userInitials = generateUserInitials(user.firstName, user.lastName);

  // Helper to format date safely
  const formatDate = (dateString: string | undefined | null): string => {
    if (!dateString) return 'Not provided';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (error) {
      console.error('Error formatting date:', error, dateString);
      return 'Invalid Date';
    }
  };

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: '100vh',
        px: { xs: 2, sm: 3, md: 4 },
        py: designTokens.spacing.xl,
      }}
    >
      {actionError && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link
          component="button"
          variant="body1"
          onClick={() => router.push('/users')}
          sx={{ textDecoration: 'none', color: 'text.secondary' }}
        >
          Users
        </Link>
        <Typography color="text.primary">User Details</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
            sx={{ textTransform: 'none' }}
          >
            Back
          </Button>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            User Details
          </Typography>
        </Stack>
        <Stack direction="row" spacing={2}>
          {isEditing ? (
            <>
              <Button
                variant="outlined"
                onClick={handleCancelEdit}
                sx={{ textTransform: 'none' }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={!hasChanges}
                sx={{ textTransform: 'none' }}
              >
                Save
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={handleEdit}
                sx={{ textTransform: 'none' }}
              >
                Edit User
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleDeleteClick}
                sx={{ textTransform: 'none' }}
              >
                Delete User
              </Button>
            </>
          )}
        </Stack>
      </Stack>

      {/* User Details */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: '8px',
          border: '1px solid #E0E0E0',
          p: 3,
        }}
      >
        {/* User Header */}
        <Stack direction="row" spacing={3} alignItems="center" sx={{ mb: 4 }}>
          <Avatar
            sx={{
              width: 80,
              height: 80,
              bgcolor: '#F9B4B4',
              color: '#333',
              fontSize: '24px',
              fontWeight: 500,
              border: '1px solid #E57373',
            }}
          >
            {userInitials}
          </Avatar>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
              {user.firstName} {user.lastName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {user.email}
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ mb: 3 }} />

        {/* User Information Fields (Read-only - API doesn't support updating these) */}
        <Stack spacing={3}>
          <Box>
            <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
              First Name
            </Typography>
            <Typography variant="body1">{user.firstName || 'Not provided'}</Typography>
          </Box>

          <Box>
            <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
              Last Name
            </Typography>
            <Typography variant="body1">{user.lastName || 'Not provided'}</Typography>
          </Box>

          <Box>
            <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
              Email Address
            </Typography>
            <Typography variant="body1">{user.email || 'Not provided'}</Typography>
          </Box>

          <Box>
            <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
              Phone Number
            </Typography>
            <Typography variant="body1">{user.phone || user.phoneNumber || 'Not provided'}</Typography>
          </Box>

          <Box>
            <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
              Role
            </Typography>
            <Typography variant="body1">
              {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}
            </Typography>
          </Box>

          <Box>
            <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
              Plan
            </Typography>
            <Typography variant="body1">
              {user.plan ? user.plan.charAt(0).toUpperCase() + user.plan.slice(1) : 'Free'}
            </Typography>
          </Box>

          <Box>
            <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
              Status
            </Typography>
            {isEditing ? (
              <FormControl fullWidth size="small">
                <Select
                  value={editedData?.isActive ? 'active' : 'inactive'}
                  onChange={(e) => handleFieldChange('isActive', e.target.value === 'active')}
                  variant="outlined"
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            ) : (
              <Typography variant="body1">
                {user.isActive ? 'Active' : 'Inactive'}
              </Typography>
            )}
          </Box>

          <Box>
            <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
              Location
            </Typography>
            <Typography variant="body1">{user.location || 'Not provided'}</Typography>
          </Box>

          <Box>
            <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
              Created At
            </Typography>
            <Typography variant="body1">
              {formatDate(user.createdAt)}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        title="Delete User"
        message="Are you sure you want to delete this user information from the system? This action is irreversible"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteDialogOpen(false)}
      />

      {/* Save Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={saveDialogOpen}
        title="Save Changes"
        message="Are you sure you want to save these changes? This will update the user information in the system."
        confirmLabel="Yes, Save"
        cancelLabel="No, Discard"
        onConfirm={handleConfirmSave}
        onCancel={handleDiscardChanges}
      />

      {/* Edit Success Dialog */}
      <SuccessDialog
        open={editSuccessDialogOpen}
        title="Success"
        message="User has been updated successfully."
        onClose={handleEditSuccessClose}
      />

      {/* Delete Success Dialog */}
      <SuccessDialog
        open={deleteSuccessDialogOpen}
        title="Success"
        message="User has been deleted successfully."
        onClose={handleDeleteSuccessClose}
      />
    </Box>
  );
}

export default memo(UserDetailPage);
