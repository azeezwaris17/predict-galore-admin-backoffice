import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Skeleton,
} from '@mui/material';
import {
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Add as AddIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import {
  useTeamMembers,
  useInviteTeamMembers,
  useUpdateTeamMemberRole,
  useRemoveTeamMember,
} from '@/features/settings';
import { createLogger } from '@/shared/api';
import { TeamMember, InviteTeamMemberData } from '@/features/settings';
import { UserRole } from '@/features/users';

interface TabComponentProps {
  showNotification: (message: string, severity: 'success' | 'error' | 'warning') => void;
}

type TeamInvite = InviteTeamMemberData;

const logger = createLogger('Settings:TeamsTab');

// Types
interface FilterState {
  search: string;
  role: string;
}

interface DialogState {
  invite: boolean;
  editRole: boolean;
  delete: boolean;
}

// Loading Skeleton
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _TeamsSkeleton = () => (
  <Box>
    <Skeleton variant="text" width="60%" height={40} sx={{ mb: 2 }} />
    <Skeleton variant="rectangular" width="100%" height={400} />
  </Box>
);

// Dialog Components (keep the same...)
const InviteDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onInvite: (emails: string[], role: UserRole) => Promise<void>;
}> = ({ open, onClose, onInvite }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('viewer');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) return;

    setLoading(true);
    try {
      await onInvite([email.trim()], role);
      setEmail('');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Invite Team Member</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          sx={{ mb: 3, mt: 1 }}
        />
        <TextField
          select
          fullWidth
          label="Role"
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          SelectProps={{ native: true }}
        >
          <option value="admin">Admin</option>
          <option value="editor">Editor</option>
          <option value="viewer">Viewer</option>
        </TextField>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!email.trim() || loading}>
          {loading ? 'Sending...' : 'Send Invite'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const EditRoleDialog: React.FC<{
  open: boolean;
  member: TeamMember | null;
  onClose: () => void;
  onSave: (role: UserRole) => Promise<void>;
}> = ({ open, member, onClose, onSave }) => {
  const [role, setRole] = useState<UserRole>((member?.role as UserRole) || 'viewer');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave(role);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Role</DialogTitle>
      <DialogContent>
        <Typography sx={{ mb: 2 }}>
          Update role for <strong>{member?.email}</strong>
        </Typography>
        <TextField
          select
          fullWidth
          label="Role"
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          SelectProps={{ native: true }}
        >
          <option value="admin">Admin</option>
          <option value="editor">Editor</option>
          <option value="viewer">Viewer</option>
        </TextField>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={loading}>
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const DeleteDialog: React.FC<{
  open: boolean;
  member: TeamMember | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}> = ({ open, member, onClose, onConfirm }) => {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Remove Team Member</DialogTitle>
      <DialogContent>
        <Typography>
          Are you sure you want to remove <strong>{member?.email}</strong> from the team?
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} variant="contained" color="error" disabled={loading}>
          {loading ? 'Removing...' : 'Remove'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Helper function to safely extract team members
const getTeamMembersFromResponse = (response: unknown): TeamMember[] => {
  if (!response) return [];

  // If response is already an array
  if (Array.isArray(response)) {
    return response;
  }

  // If response is an object
  if (typeof response === 'object' && response !== null) {
    const responseObj = response as Record<string, unknown>;

    // If response has a data property that's an array
    if (responseObj.data && Array.isArray(responseObj.data)) {
      return responseObj.data;
    }

    // Try to find any array property in the response
    for (const key in responseObj) {
      const value = responseObj[key];
      if (Array.isArray(value)) {
        return value;
      }
    }
  }

  return [];
};

// Main Component
export const TeamsTab: React.FC<TabComponentProps> = ({ showNotification }) => {
  // State
  const [filters, setFilters] = useState<FilterState>({ search: '', role: 'All' });
  const [dialogs, setDialogs] = useState<DialogState>({
    invite: false,
    editRole: false,
    delete: false,
  });
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  // API Hooks
  const { data: teamResponse, isLoading, error, refetch } = useTeamMembers();
  const inviteMembersMutation = useInviteTeamMembers();
  const updateRoleMutation = useUpdateTeamMemberRole();
  const removeMemberMutation = useRemoveTeamMember();

  // Wrapper functions for mutations
  const inviteMembers = async (invites: TeamInvite[]) => {
    // Invite each member sequentially
    for (const invite of invites) {
      await inviteMembersMutation.mutateAsync({
        email: invite.email,
        role: invite.role,
      });
    }
  };

  const updateRole = async ({ memberId, newRole }: { memberId: string; newRole: UserRole }) => {
    await updateRoleMutation.mutateAsync({
      id: memberId,
      role: newRole,
    });
  };

  const removeMember = async (memberId: string) => {
    await removeMemberMutation.mutateAsync(memberId);
  };

  // Safely extract team members from API response
  const teamMembers: TeamMember[] = getTeamMembersFromResponse(teamResponse);

  // Filtering - ensure teamMembers is an array
  const filteredMembers = Array.isArray(teamMembers)
    ? teamMembers.filter((member) => {
        if (!member || typeof member !== 'object') return false;

        const memberName = member.email || '';
        const memberEmail = member.email || '';
        const memberRole = member.role || '';

        const matchesSearch =
          memberName.toLowerCase().includes(filters.search.toLowerCase()) ||
          memberEmail.toLowerCase().includes(filters.search.toLowerCase());
        const matchesRole = filters.role === 'All' || memberRole === filters.role;
        return matchesSearch && matchesRole;
      })
    : [];

  // Handlers
  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, member: TeamMember) => {
    setMenuAnchor(event.currentTarget);
    setSelectedMember(member);
  };

  const handleCloseMenu = () => {
    setMenuAnchor(null);
  };

  const handleInvite = async (emails: string[], role: UserRole) => {
    try {
      const invites: TeamInvite[] = emails.map((email) => ({ email, role }));
      await inviteMembers(invites);
      showNotification('Invitation sent successfully', 'success');
      refetch();
    } catch (error) {
      const errObj = error as Record<string, unknown>;
      const data = (errObj.data as Record<string, unknown>) || errObj;
      const msg = (data.error as string) || (data.message as string) || (errObj.message as string) || 'Failed to send invitation';
      showNotification(msg, 'error');
      logger.error('Invite error', { error });
    }
  };

  const handleUpdateRole = async (role: UserRole) => {
    if (!selectedMember) return;

    try {
      await updateRole({ memberId: selectedMember.id, newRole: role });
      showNotification('Role updated successfully', 'success');
      refetch();
    } catch (error) {
      const errObj = error as Record<string, unknown>;
      const data = (errObj.data as Record<string, unknown>) || errObj;
      const msg = (data.error as string) || (data.message as string) || (errObj.message as string) || 'Failed to update role';
      showNotification(msg, 'error');
      logger.error('Update role error', { error });
    }
  };

  const handleRemoveMember = async () => {
    if (!selectedMember) return;

    try {
      await removeMember(selectedMember.id);
      showNotification('Member removed successfully', 'success');
      refetch();
    } catch (error) {
      const errObj = error as Record<string, unknown>;
      const data = (errObj.data as Record<string, unknown>) || errObj;
      const msg = (data.error as string) || (data.message as string) || (errObj.message as string) || 'Failed to remove member';
      showNotification(msg, 'error');
      logger.error('Remove member error', { error });
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Team Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogs((prev) => ({ ...prev, invite: true }))}
        >
          Invite Member
        </Button>
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          placeholder="Search members..."
          size="small"
          value={filters.search}
          onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
          InputProps={{ startAdornment: <SearchIcon /> }}
          sx={{ width: 300 }}
        />
        <Button
          variant="outlined"
          startIcon={<FilterIcon />}
          onClick={() => {
            // Simple role filter toggle
            const roles = ['All', 'Admin', 'Editor', 'Viewer'];
            const currentIndex = roles.indexOf(filters.role);
            const nextIndex = (currentIndex + 1) % roles.length;
            setFilters((prev) => ({ ...prev, role: roles[nextIndex] }));
          }}
        >
          Role: {filters.role}
        </Button>
      </Box>

      {/* Team Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color="text.secondary">Loading team members...</Typography>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <Typography variant="h6" color="error.main">
                      Failed to Load Team Members
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Please try again
                    </Typography>
                    <Button variant="outlined" onClick={() => refetch()} size="small">
                      Retry
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ) : filteredMembers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    {teamMembers.length === 0
                      ? 'No team members found'
                      : 'No matching team members'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredMembers.map((member) => (
                <TableRow key={member.id} hover>
                  <TableCell>
                    <Typography fontWeight="medium">{member.email || 'Unknown'}</Typography>
                  </TableCell>
                  <TableCell>{member.email || 'No email'}</TableCell>
                  <TableCell>
                    <Chip
                      label={member.role || 'No role'}
                      size="small"
                      color={member.role === 'Admin' ? 'primary' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={member.status || 'unknown'}
                      size="small"
                      color={member.status === 'active' ? 'success' : 'warning'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton onClick={(e) => handleOpenMenu(e, member)}>
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Action Menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleCloseMenu}>
        <MenuItem
          onClick={() => {
            setDialogs((prev) => ({ ...prev, editRole: true }));
            handleCloseMenu();
          }}
        >
          Edit Role
        </MenuItem>
        <MenuItem
          onClick={() => {
            setDialogs((prev) => ({ ...prev, delete: true }));
            handleCloseMenu();
          }}
          sx={{ color: 'error.main' }}
        >
          Remove Member
        </MenuItem>
      </Menu>

      {/* Dialogs */}
      <InviteDialog
        open={dialogs.invite}
        onClose={() => setDialogs((prev) => ({ ...prev, invite: false }))}
        onInvite={handleInvite}
      />

      <EditRoleDialog
        open={dialogs.editRole}
        member={selectedMember}
        onClose={() => setDialogs((prev) => ({ ...prev, editRole: false }))}
        onSave={handleUpdateRole}
      />

      <DeleteDialog
        open={dialogs.delete}
        member={selectedMember}
        onClose={() => setDialogs((prev) => ({ ...prev, delete: false }))}
        onConfirm={handleRemoveMember}
      />
    </Box>
  );
};
