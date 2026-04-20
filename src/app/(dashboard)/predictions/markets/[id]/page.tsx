/**
 * Market Detail Page
 */

'use client';

import { useCallback, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Box, Paper, Typography, Button, Stack, Chip, Divider, CircularProgress, Alert } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useMarket, useDeleteMarket } from '@/features/markets';
import { DeleteConfirmationDialog } from '@/shared/components/DeleteConfirmationDialog';
import { SuccessDialog } from '@/shared/components/SuccessDialog';
import { useQueryClient } from '@tanstack/react-query';

export default function MarketDetailPage() {
  const router = useRouter();
  const params = useParams();
  const marketId = parseInt(params.id as string, 10);
  const queryClient = useQueryClient();
  
  const { data: market, isLoading, error } = useMarket(marketId);
  const deleteMarket = useDeleteMarket();
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteSuccessDialogOpen, setDeleteSuccessDialogOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleBack = useCallback(() => {
    router.push('/predictions/markets');
  }, [router]);

  const handleEdit = useCallback(() => {
    router.push(`/predictions/markets/${marketId}/edit`);
  }, [router, marketId]);

  const handleDeleteClick = useCallback(() => {
    setDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    setDeleteDialogOpen(false);
    try {
      await deleteMarket.mutateAsync(marketId);
      await queryClient.invalidateQueries({ queryKey: ['markets'] });
      await queryClient.invalidateQueries({ queryKey: ['markets-analytics'] });
      setDeleteSuccessDialogOpen(true);
    } catch (error) {
      console.error('Failed to delete market:', error);
      const errObj = error as Record<string, unknown>;
      const data = (errObj.data as Record<string, unknown>) || {};
      const msg =
        (data.error as string) ||
        (data.message as string) ||
        (errObj.message as string) ||
        'Failed to delete market. Please try again.';
      setActionError(msg);
    }
  }, [deleteMarket, marketId, queryClient]);

  const handleDeleteSuccess = useCallback(() => {
    setDeleteSuccessDialogOpen(false);
    router.push('/predictions/markets');
  }, [router]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !market) {
    return (
      <Box>
        <Typography variant="h5" sx={{ mb: 2 }}>Market Not Found</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          The requested market could not be found
        </Typography>
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack}>
          Back to Markets
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', px: { xs: 2, sm: 3, md: 4 }, py: 3 }}>
      {actionError && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}
      {/* Back Button */}
      <Button 
        startIcon={<ArrowBackIcon />} 
        onClick={handleBack}
        sx={{ mb: 3 }}
      >
        Back to Markets
      </Button>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <Button variant="contained" startIcon={<EditIcon />} onClick={handleEdit}>
          Edit Market
        </Button>
        <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={handleDeleteClick}>
          Delete Market
        </Button>
      </Stack>

      <Paper sx={{ p: 4 }}>
        <Stack spacing={3}>
          {/* Header */}
          <Box>
            <Typography variant="h5" sx={{ mb: 1, fontWeight: 700 }}>
              {market.displayName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Market #{market.id}
            </Typography>
          </Box>

          <Divider />

          {/* Basic Information */}
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>Basic Information</Typography>
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" color="text.secondary">Market Name (Key)</Typography>
                <Typography variant="body1">{market.name}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Display Name</Typography>
                <Typography variant="body1">{market.displayName}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Category</Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip label={market.category} size="small" />
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Description</Typography>
                <Typography variant="body1">{market.description}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Sort Order</Typography>
                <Typography variant="body1">{market.sortOrder}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Status</Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    label={market.isActive ? 'Active' : 'Inactive'}
                    color={market.isActive ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
              </Box>
            </Stack>
          </Box>

          <Divider />

          {/* Selections */}
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Selections ({market.selections?.length || 0})
            </Typography>
            {market.selections && market.selections.length > 0 ? (
              <Stack spacing={2}>
                {market.selections.map((selection, index) => (
                  <Paper key={selection.id || index} variant="outlined" sx={{ p: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {selection.selectionLabel}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Key: {selection.selectionKey} | Sort Order: {selection.sortOrder}
                        </Typography>
                      </Box>
                      <Chip
                        label={selection.isActive ? 'Active' : 'Inactive'}
                        size="small"
                        color={selection.isActive ? 'success' : 'default'}
                      />
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No selections available
              </Typography>
            )}
          </Box>
        </Stack>
      </Paper>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        title="Delete Market"
        message={`Are you sure you want to delete the market "${market.displayName}"? This action is irreversible.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteDialogOpen(false)}
      />

      {/* Delete Success Dialog */}
      <SuccessDialog
        open={deleteSuccessDialogOpen}
        title="Market Deleted"
        message="The market has been successfully deleted from the system."
        onClose={handleDeleteSuccess}
      />
    </Box>
  );
}
