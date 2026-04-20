/**
 * Users Table Component
 * Clean, simple implementation
 */

'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Button,
  Chip,
  InputAdornment,
  Select,
  FormControl,
  InputLabel,
  MenuItem as SelectMenuItem,
  Avatar,
  Typography,
  Checkbox,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  MoreVert as MoreVertIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import Stack from '@mui/material/Stack';
import {
  TableErrorState,
  TableEmptyState,
  TableLoadingState,
} from '@/shared/components/TableStates';
import { User, UserStatus, SubscriptionPlan, UserRole, UsersFilter, generateUserInitials } from '@/features/users';
import { PaginationMeta } from '@/shared/types/common.types';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { SelectedUserProfile } from './SelectedUserProfile';
import { useTableExport } from '@/shared/hooks/useTableExport';
import { PrevNextPagination } from '@/shared/components/PrevNextPagination';

interface UsersTableProps {
  users: User[];
  pagination: PaginationMeta | null;
  isLoading: boolean;
  error: Error | null;
  filters: UsersFilter;
  onFilterChange: (filters: Partial<UsersFilter>) => void;
  onClearFilters: () => void;
  onAddUser: () => void;
  onRefresh: () => void;
  selectedUser?: User | null;
  onUserSelect?: (user: User | null) => void;
}

interface UserRowProps {
  user: User;
  isSelected: boolean;
  onSelect: (userId: string, user: User) => void;
  onMenuOpen: (event: React.MouseEvent<HTMLElement>, user: User) => void;
  style?: React.CSSProperties;
}

const UserRow = memo(function UserRow({
  user,
  isSelected,
  onSelect,
  onMenuOpen,
  style,
}: UserRowProps) {
  const userInitials = generateUserInitials(user.firstName, user.lastName);

  return (
    <TableRow
      hover
      onClick={() => onSelect(user.id, user)}
      sx={{
        cursor: 'pointer',
        bgcolor: isSelected ? 'action.selected' : 'transparent',
        '&:hover': {
          bgcolor: isSelected ? 'action.selected' : 'action.hover',
        },
      }}
      style={style}
    >
      <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onChange={() => onSelect(user.id, user)}
        />
      </TableCell>
      <TableCell>
        <Stack direction="row" spacing={1} alignItems="center">
          <Avatar
            sx={{
              width: 32,
              height: 32,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {userInitials}
          </Avatar>
          <Typography variant="body2">
            {`${user.firstName} ${user.lastName}`}
          </Typography>
        </Stack>
      </TableCell>
      <TableCell>{user.email}</TableCell>
      <TableCell>
        <Chip
          label={user.plan ? user.plan.charAt(0).toUpperCase() + user.plan.slice(1) : 'Free'}
          size="small"
          color={user.plan === 'premium' || user.plan === 'enterprise' ? 'success' : 'default'}
        />
      </TableCell>
      <TableCell>
        <Chip
          label={user.isActive ? 'Active' : 'Inactive'}
          size="small"
          color={user.isActive ? 'success' : 'default'}
        />
      </TableCell>
      <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
        <IconButton size="small" onClick={(e) => onMenuOpen(e, user)}>
          <MoreVertIcon />
        </IconButton>
      </TableCell>
    </TableRow>
  );
});

export const UsersTable = memo(function UsersTable({
  users,
  pagination,
  isLoading,
  error,
  filters,
  onFilterChange,
  onClearFilters,
  onAddUser,
  onRefresh,
  selectedUser,
  onUserSelect,
}: UsersTableProps) {
  // CSV Export hook
  const { handleExport, canExport } = useTableExport({
    data: users,
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'firstName', label: 'First Name' },
      { key: 'lastName', label: 'Last Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'plan', label: 'Plan', format: (value) => String(value || 'Free') },
      { key: 'status', label: 'Status', format: (value) => String(value || 'active') },
      { key: 'location', label: 'Location' },
      { key: 'createdAt', label: 'Created At', format: (value) => value ? new Date(String(value)).toLocaleDateString() : '' },
    ],
    filename: `users-${new Date().toISOString().split('T')[0]}`,
  });
  const router = useRouter();
  const [search, setSearch] = useState(filters.search || '');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuUser, setMenuUser] = useState<User | null>(null);
  
  // Debounce search input
  const debouncedSearch = useDebounce(search, 300);
  
  // Sync selectedIds with selectedUser (single-select)
  useEffect(() => {
    if (selectedUser) {
      setSelectedIds(new Set([selectedUser.id]));
    } else {
      setSelectedIds(new Set());
    }
  }, [selectedUser]);
  
  // Update filters when debounced search changes
  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      onFilterChange({ search: debouncedSearch || undefined, page: 1 });
    }
  }, [debouncedSearch, filters.search, onFilterChange]);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const handleSelectOne = useCallback((userId: string, user: User) => {
    // Single-select: if clicking the same item, deselect it; otherwise select the new one
    if (selectedUser?.id === userId) {
      // Deselect if clicking the already selected item
      setSelectedIds(new Set());
      setTimeout(() => onUserSelect?.(null), 0);
    } else {
      // Select the new item (only one at a time)
      setSelectedIds(new Set([userId]));
      setTimeout(() => onUserSelect?.(user), 0);
    }
  }, [selectedUser, onUserSelect]);

  const handleFilterChange = useCallback((key: keyof UsersFilter, value: string | UserStatus | SubscriptionPlan | UserRole | undefined) => {
    onFilterChange({ [key]: value || undefined, page: 1 } as Partial<UsersFilter>);
  }, [onFilterChange]);

  const handleClearFilters = useCallback(() => {
    setSearch('');
    onClearFilters();
  }, [onClearFilters]);

  const hasActiveFilters = Boolean(filters.status || filters.plan || filters.search);

  const statusOptions: UserStatus[] = ['active', 'inactive', 'suspended', 'pending'];
  const planOptions: SubscriptionPlan[] = ['free', 'basic', 'premium', 'enterprise'];

  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>, user: User) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setMenuUser(user);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
    setMenuUser(null);
  }, []);

  const handleMenuViewDetails = useCallback(() => {
    if (menuUser) {
      router.push(`/users/${menuUser.id}`);
      handleMenuClose();
    }
  }, [menuUser, router, handleMenuClose]);

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{ mb: 3, justifyContent: 'space-between' }}
        alignItems={{ xs: 'stretch', md: 'center' }}
      >
        {/* Left side: Search and Filters (max 2) */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          sx={{ width: { xs: '100%', md: 'auto' } }}
        >
          <TextField
            placeholder="Search users..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            size="small"
            sx={{ minWidth: { xs: '100%', sm: 250 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.status || ''}
              label="Status"
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <SelectMenuItem value="">All</SelectMenuItem>
              {statusOptions.map((status) => (
                <SelectMenuItem key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </SelectMenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Plan</InputLabel>
            <Select
              value={filters.plan || ''}
              label="Plan"
              onChange={(e) => handleFilterChange('plan', e.target.value)}
            >
              <SelectMenuItem value="">All</SelectMenuItem>
              {planOptions.map((plan) => (
                <SelectMenuItem key={plan} value={plan}>
                  {plan.charAt(0).toUpperCase() + plan.slice(1)}
                </SelectMenuItem>
              ))}
            </Select>
          </FormControl>

          {hasActiveFilters && (
            <Button size="small" onClick={handleClearFilters} sx={{ minWidth: 'auto' }}>
              Clear
            </Button>
          )}
        </Stack>

        {/* Right side: Action buttons */}
        <Stack direction="row" spacing={2} alignItems="center" sx={{ flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            disabled={!canExport}
          >
            Export CSV
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={onAddUser}>
            Add User
          </Button>
        </Stack>
      </Stack>

      <TableContainer
        component={Paper}
        sx={{
          width: '100%',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        <Table sx={{ minWidth: 900 }}>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                {/* Single-select: no select all checkbox */}
              </TableCell>
              <TableCell>Full Name</TableCell>
              <TableCell>Email Address</TableCell>
              <TableCell>Plan</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Date</TableCell>
                    <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          {isLoading ? (
            <TableBody>
              <TableRow>
                <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4 }}>
                  <TableLoadingState message="Loading users..." />
                </TableCell>
              </TableRow>
            </TableBody>
          ) : error ? (
            <TableBody>
              <TableErrorState colSpan={8} message="Failed to load users. Please try again." onRetry={onRefresh} />
            </TableBody>
          ) : users.length === 0 ? (
            <TableBody>
              <TableEmptyState
                colSpan={8}
                message="No users found"
                title="No Users"
              />
            </TableBody>
          ) : (
            <TableBody>
              {users.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  isSelected={selectedIds.has(user.id)}
                  onSelect={handleSelectOne}
                  onMenuOpen={handleMenuOpen}
                />
              ))}
            </TableBody>
          )}
        </Table>
      </TableContainer>

      {pagination && (
        <PrevNextPagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={(page) => onFilterChange({ page })}
        />
      )}

      {/* Selected User Profile */}
      {selectedUser && <SelectedUserProfile user={selectedUser} />}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={handleMenuViewDetails}>
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>
      </Menu>

    </Box>
  );
});
