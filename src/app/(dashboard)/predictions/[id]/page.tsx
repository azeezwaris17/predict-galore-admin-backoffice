/**
 * Prediction Detail Page
 * Shows detailed information about a single prediction
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
  TextField,
  Alert,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { designTokens } from '@/shared/styles/tokens';
import { usePrediction, useDeletePrediction, useUpdatePrediction, UpdatePredictionPayload, AudienceType } from '@/features/predictions';
import { useQueryClient } from '@tanstack/react-query';
import { DeleteConfirmationDialog } from '@/shared/components/DeleteConfirmationDialog';
import { SuccessDialog } from '@/shared/components/SuccessDialog';

function PredictionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const predictionId = params.id as string;
  const queryClient = useQueryClient();

  const { data: prediction, isLoading, error } = usePrediction(predictionId);
  const deletePrediction = useDeletePrediction();
  const updatePrediction = useUpdatePrediction();
  
  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<UpdatePredictionPayload | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [editSuccessDialogOpen, setEditSuccessDialogOpen] = useState(false);
  const [deleteSuccessDialogOpen, setDeleteSuccessDialogOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Initialize edited data when editing starts
  useEffect(() => {
    if (prediction && isEditing && !editedData) {
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => {
        const initialData: UpdatePredictionPayload = {
          fixtureId: prediction.fixtureId,
          title: prediction.title,
          analysis: prediction.analysis,
          accuracy: prediction.accuracy,
          expertAnalysis: prediction.expertAnalysis,
          audience: prediction.audience as AudienceType,
          includeTeamForm: prediction.includeTeamForm,
          includeTeamComparison: prediction.includeTeamComparison,
          includeTopScorers: prediction.includeTopScorers,
          isPremium: prediction.isPremium,
          isScheduled: prediction.isScheduled,
          scheduledTime: prediction.scheduledTime || (prediction.isScheduled ? new Date().toISOString() : null),
          picks: prediction.picks || [],
          cmd: 'update', // Required for PUT requests
        };
        setEditedData(initialData);
      }, 0);
    }
  }, [prediction, isEditing, editedData]);

  const handleBack = useCallback(() => {
    if (isEditing && hasChanges) {
      setSaveDialogOpen(true);
    } else {
      router.push('/predictions');
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
    if (!editedData) return;
    
    try {
      // Prepare payload - ensure all fields match API expectations
      // Handle scheduledTime: if not scheduled, send null (not empty string)
      const scheduledTimeValue = editedData.isScheduled 
        ? (editedData.scheduledTime || new Date().toISOString())
        : null;
      
      const payload: UpdatePredictionPayload = {
        fixtureId: editedData.fixtureId,
        title: editedData.title || '',
        analysis: editedData.analysis || '',
        accuracy: editedData.accuracy || 0,
        expertAnalysis: editedData.expertAnalysis || '',
        audience: (editedData.audience === 'All' ? 'FREE' : editedData.audience) as AudienceType,
        includeTeamForm: editedData.includeTeamForm ?? false,
        includeTeamComparison: editedData.includeTeamComparison ?? false,
        includeTopScorers: editedData.includeTopScorers ?? false,
        isPremium: editedData.isPremium ?? false,
        isScheduled: editedData.isScheduled ?? false,
        scheduledTime: scheduledTimeValue,
        picks: editedData.picks || [],
        cmd: 'update', // Required field for PUT requests
      };
      
      // Debug: Log the payload being sent
       
      console.log('Updating prediction with payload:', JSON.stringify(payload, null, 2));
      
      await updatePrediction.mutateAsync({ id: predictionId, data: payload });
      setIsEditing(false);
      setEditedData(null);
      setHasChanges(false);
      setSaveDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['prediction', predictionId] });
      // Show success dialog
      setEditSuccessDialogOpen(true);
    } catch (error: unknown) {
      console.error('Failed to update prediction:', error);
      let errorMessage = 'Failed to update prediction. Please try again.';
      if (error && typeof error === 'object') {
        const errObj = error as Record<string, unknown>;
        const data = (errObj.data as Record<string, unknown>) || {};
        errorMessage =
          (data.error as string) ||
          (data.message as string) ||
          (errObj.message as string) ||
          errorMessage;
      }
      setSaveDialogOpen(false);
      setActionError(errorMessage);
    }
  }, [editedData, predictionId, updatePrediction, queryClient]);

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
      await deletePrediction.mutateAsync(predictionId);
      queryClient.invalidateQueries({ queryKey: ['predictions'] });
      setDeleteDialogOpen(false);
      // Show success dialog
      setDeleteSuccessDialogOpen(true);
    } catch (error) {
      console.error('Failed to delete prediction:', error);
      const errObj = error as Record<string, unknown>;
      const data = (errObj.data as Record<string, unknown>) || {};
      const msg =
        (data.error as string) ||
        (data.message as string) ||
        (errObj.message as string) ||
        'Failed to delete prediction. Please try again.';
      setDeleteDialogOpen(false);
      setActionError(msg);
    }
  }, [deletePrediction, predictionId, queryClient]);

  const handleEditSuccessClose = useCallback(() => {
    setEditSuccessDialogOpen(false);
  }, []);

  const handleDeleteSuccessClose = useCallback(() => {
    setDeleteSuccessDialogOpen(false);
    // Navigate back to predictions list after closing success dialog
    router.push('/predictions');
  }, [router]);

  const handleFieldChange = useCallback((field: keyof UpdatePredictionPayload, value: unknown) => {
    if (!editedData) return;
    
    setEditedData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [field]: value,
      };
    });
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

  if (error || !prediction) {
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
          Failed to load prediction. Please try again.
        </Typography>
      </Box>
    );
  }

  // Extract data from prediction API response
  // Extract match name from title (format: "Prediction for Team1 vs Team2")
  const matchName = prediction.title?.replace(/^Prediction for /i, '') || 
                    prediction.match || 
                    'Unknown Match';
  
  // Extract team names from match name
  const homeTeam = matchName.includes(' vs ') ? matchName.split(' vs ')[0].trim() : 'Home';
  const awayTeam = matchName.includes(' vs ') ? matchName.split(' vs ')[1].trim() : 'Away';
  
  // Get league and sport (fixture details not available in prediction response)
  const leagueName = 'Unknown League';
  const sportName = 'Football'; // Default, could be enhanced if fixture has sport info

  // Extract predicted outcome from picks
  // Look for various market types that might indicate match winner
  const matchWinnerPick = prediction.picks?.find(
    (pick) => 
      pick.market === 'FullTimeResult_1X2' || 
      pick.market === 'MatchWinner' ||
      pick.selectionKey === 'HOME' ||
      pick.selectionKey === 'AWAY' ||
      pick.selectionKey === '1' ||
      pick.selectionKey === '2'
  );
  
  // For DoubleChance market, extract the selection
  const doubleChancePick = prediction.picks?.find((pick) => pick.market === 'DoubleChance');
  
  const matchWinner = matchWinnerPick?.selectionLabel || 
                     doubleChancePick?.selectionLabel || 
                     matchWinnerPick?.teamName || 
                     'N/A';
  const confidence = matchWinnerPick ? `${matchWinnerPick.confidence}%` : 
                    doubleChancePick ? `${doubleChancePick.confidence}%` : 
                    `${prediction.accuracy}%`;

  // Extract correct score from picks
  const correctScorePick = prediction.picks?.find(
    (pick) => pick.market === 'CorrectScore' || (pick.homeScore > 0 || pick.awayScore > 0)
  );
  const homeScore = correctScorePick?.homeScore || 0;
  const awayScore = correctScorePick?.awayScore || 0;

  // Extract goal scorers from picks
  const firstTimeGoalScorerPick = prediction.picks?.find(
    (pick) => pick.subType === 'FirstTimeGoalScorer' || 
              pick.market?.toLowerCase().includes('first') ||
              (pick.playerName && pick.subType?.toLowerCase().includes('first'))
  );
  const lastTimeGoalScorerPick = prediction.picks?.find(
    (pick) => pick.subType === 'LastTimeGoalScorer' || 
              pick.market?.toLowerCase().includes('last') ||
              (pick.playerName && pick.subType?.toLowerCase().includes('last'))
  );

  // Extract 1x2 odds from picks
  const homePick = prediction.picks?.find((pick) => 
    pick.selectionKey === 'HOME' || 
    pick.selectionKey === '1' ||
    (pick.market === 'FullTimeResult_1X2' && pick.selectionKey === '1')
  );
  const drawPick = prediction.picks?.find((pick) => 
    pick.selectionKey === 'DRAW' || 
    pick.selectionKey === 'X' ||
    (pick.market === 'FullTimeResult_1X2' && pick.selectionKey === 'X')
  );
  const awayPick = prediction.picks?.find((pick) => 
    pick.selectionKey === 'AWAY' || 
    pick.selectionKey === '2' ||
    (pick.market === 'FullTimeResult_1X2' && pick.selectionKey === '2')
  );

  const getTeamInitials = (teamName: string): string => {
    const parts = teamName.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return teamName.substring(0, 2).toUpperCase();
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
          onClick={handleBack}
          sx={{
            display: 'flex',
            alignItems: 'center',
            textDecoration: 'none',
            color: 'inherit',
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          <ArrowBackIcon sx={{ mr: 0.5, fontSize: 18 }} />
          Back
        </Link>
        <Typography color="text.primary">Prediction</Typography>
      </Breadcrumbs>

      {/* Header with Title and Actions */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={2}
        sx={{ mb: 4 }}
      >
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Prediction
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
          {isEditing ? (
            <>
              <Button
                variant="outlined"
                onClick={handleCancelEdit}
                sx={{
                  borderColor: '#666',
                  color: '#666',
                  '&:hover': {
                    borderColor: '#333',
                    color: '#333',
                  },
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={!hasChanges}
                sx={{
                  bgcolor: '#4CAF50',
                  '&:hover': { bgcolor: '#45a049' },
                }}
              >
                Save
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={handleEdit}
                sx={{
                  bgcolor: '#4CAF50',
                  '&:hover': { bgcolor: '#45a049' },
                }}
              >
                Edit Prediction
              </Button>
              <Button
                variant="outlined"
                startIcon={<DeleteIcon />}
                onClick={handleDeleteClick}
                sx={{
                  borderColor: '#f44336',
                  color: '#f44336',
                  '&:hover': {
                    borderColor: '#d32f2f',
                    color: '#d32f2f',
                    bgcolor: 'rgba(244, 67, 54, 0.04)',
                  },
                }}
              >
                Delete Prediction
              </Button>
            </>
          )}
        </Stack>
      </Stack>

      {/* Sport Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
          Sport
        </Typography>
        <Typography variant="body1" sx={{ fontWeight: 500 }}>
          {sportName}
        </Typography>
      </Paper>

      {/* League Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
          League
        </Typography>
        <Typography variant="body1" sx={{ fontWeight: 500 }}>
          {leagueName}
        </Typography>
      </Paper>

      {/* Match Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
          Match
        </Typography>
        <Typography variant="body1" sx={{ fontWeight: 500 }}>
          {matchName}
        </Typography>
      </Paper>

      {/* Predicted Outcome Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Predicted Outcome
        </Typography>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" sx={{ color: '#666' }}>
              Match Winner
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {matchWinner}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" sx={{ color: '#666' }}>
              Confidence
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {confidence}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
              Comment
            </Typography>
            {isEditing ? (
              <TextField
                fullWidth
                multiline
                rows={3}
                value={editedData?.analysis || ''}
                onChange={(e) => handleFieldChange('analysis', e.target.value)}
                variant="outlined"
                size="small"
              />
            ) : (
              <Typography variant="body1">{prediction.analysis || 'No comment provided'}</Typography>
            )}
          </Box>
        </Stack>
      </Paper>

      {/* Expert Analysis Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Expert Analysis
        </Typography>
        {isEditing ? (
          <TextField
            fullWidth
            multiline
            rows={6}
            value={editedData?.expertAnalysis || ''}
            onChange={(e) => handleFieldChange('expertAnalysis', e.target.value)}
            variant="outlined"
            size="small"
          />
        ) : (
          <Typography variant="body1" sx={{ whiteSpace: 'pre-line', lineHeight: 1.8 }}>
            {prediction.expertAnalysis || 'No expert analysis provided'}
          </Typography>
        )}
      </Paper>

      {/* Correct Score Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Correct Score
        </Typography>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: '#E3F2FD',
                  color: '#1976D2',
                  fontSize: '12px',
                }}
              >
                {getTeamInitials(homeTeam)}
              </Avatar>
              <Typography variant="body1">{homeTeam}</Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {homeScore}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: '#E3F2FD',
                  color: '#1976D2',
                  fontSize: '12px',
                }}
              >
                {getTeamInitials(awayTeam)}
              </Avatar>
              <Typography variant="body1">{awayTeam}</Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {awayScore}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* Goal Scorers Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
          Goal Scorers
        </Typography>

        {/* 1st Time Goal Scorer */}
        {firstTimeGoalScorerPick && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              1st Time Goal Scorer
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: '#E3F2FD', color: '#1976D2' }}>
                {firstTimeGoalScorerPick.playerName?.[0] || '?'}
              </Avatar>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {firstTimeGoalScorerPick.playerName || 'N/A'}
              </Typography>
            </Box>
            <Stack spacing={1.5}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: '#666' }}>
                  Tip
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {firstTimeGoalScorerPick.tip || 'N/A'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: '#666' }}>
                  Confidence
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {firstTimeGoalScorerPick.confidence}%
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: '#666' }}>
                  Recent Form
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {firstTimeGoalScorerPick.recentForm || 'N/A'}
                </Typography>
              </Box>
            </Stack>
          </Box>
        )}

        {firstTimeGoalScorerPick && lastTimeGoalScorerPick && <Divider sx={{ my: 3 }} />}

        {/* Last Time Goal Scorer */}
        {lastTimeGoalScorerPick && (
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Last Time Goal Scorer
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: '#E3F2FD', color: '#1976D2' }}>
                {lastTimeGoalScorerPick.playerName?.[0] || '?'}
              </Avatar>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {lastTimeGoalScorerPick.playerName || 'N/A'}
              </Typography>
            </Box>
            <Stack spacing={1.5}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: '#666' }}>
                  Tip
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {lastTimeGoalScorerPick.tip || 'N/A'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: '#666' }}>
                  Confidence
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {lastTimeGoalScorerPick.confidence}%
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: '#666' }}>
                  Recent Form
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {lastTimeGoalScorerPick.recentForm || 'N/A'}
                </Typography>
              </Box>
            </Stack>
          </Box>
        )}
      </Paper>

      {/* 1x2 Section */}
      {(homePick || drawPick || awayPick) && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            1x2
          </Typography>
          <Stack spacing={2}>
            {homePick && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: '#666' }}>
                  Home
                </Typography>
                <Stack direction="row" spacing={3}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Odd: {homePick.odds || 'N/A'}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Confidence: {homePick.confidence}%
                  </Typography>
                </Stack>
              </Box>
            )}
            {drawPick && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: '#666' }}>
                  Draw
                </Typography>
                <Stack direction="row" spacing={3}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Odd: {drawPick.odds || 'N/A'}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Confidence: {drawPick.confidence}%
                  </Typography>
                </Stack>
              </Box>
            )}
            {awayPick && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: '#666' }}>
                  Away
                </Typography>
                <Stack direction="row" spacing={3}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Odd: {awayPick.odds || 'N/A'}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Confidence: {awayPick.confidence}%
                  </Typography>
                </Stack>
              </Box>
            )}
          </Stack>
        </Paper>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        title="Delete Prediction"
        message="Are you sure you want to delete this prediction information from the system? This action is irreversible"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteDialogOpen(false)}
      />

      {/* Save Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={saveDialogOpen}
        title="Save Changes"
        message="Are you sure you want to save these changes? This will update the prediction information in the system."
        confirmLabel="Yes, Save"
        cancelLabel="No, Discard"
        onConfirm={handleConfirmSave}
        onCancel={handleDiscardChanges}
      />

      {/* Edit Success Dialog */}
      <SuccessDialog
        open={editSuccessDialogOpen}
        title="Success"
        message="Prediction has been updated successfully."
        onClose={handleEditSuccessClose}
      />

      {/* Delete Success Dialog */}
      <SuccessDialog
        open={deleteSuccessDialogOpen}
        title="Success"
        message="Prediction has been deleted successfully."
        onClose={handleDeleteSuccessClose}
      />
    </Box>
  );
}

export default memo(PredictionDetailPage);
