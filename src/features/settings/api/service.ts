/**
 * Settings Service
 */

import { api } from '@/shared/api';
import { API_CONFIG } from '@/shared/api';
import type {
  UpdateProfileData,
  UpdateNotificationSettingsData,
  UpdateIntegrationData,
  InviteTeamMemberData,
  UpdateTeamMemberRoleData,
  UpdatePasswordData,
  UpdateSecurityData,
  ProfileSettingsResponse,
  NotificationSettingsResponse,
  IntegrationsResponse,
  TeamMembersResponse,
  SecuritySettingsResponse,
  UserProfile,
  NotificationSettings,
  Integration,
  TeamMember,
  SecuritySettings,
} from './types';

export class SettingsService {
  static async getProfile(): Promise<UserProfile> {
    const response = await api.get<ProfileSettingsResponse | UserProfile>(API_CONFIG.endpoints.settings.profile);
    // API returns UserProfile directly (not wrapped in { success, data })
    // Check if response has basicDetails (direct UserProfile format)
    if ('basicDetails' in response && response.basicDetails) {
      return response as UserProfile;
    }
    // Handle wrapped format: { success, message, errors, data: UserProfile }
    if ('data' in response && response.data && typeof response.data === 'object' && 'basicDetails' in response.data) {
      return response.data as UserProfile;
    }
    // Fallback: return as-is
    return response as UserProfile;
  }

  static async updateProfile(data: UpdateProfileData): Promise<UserProfile> {
    const response = await api.put<ProfileSettingsResponse>(
      API_CONFIG.endpoints.settings.profile,
      data
    );
    return response.data;
  }

  static async getNotificationSettings(): Promise<NotificationSettings> {
    const response = await api.get<NotificationSettingsResponse>(
      API_CONFIG.endpoints.settings.notifications
    );
    return response.data;
  }

  static async updateNotificationSettings(
    data: UpdateNotificationSettingsData
  ): Promise<NotificationSettings> {
    const response = await api.put<NotificationSettingsResponse>(
      API_CONFIG.endpoints.settings.notifications,
      data
    );
    return response.data;
  }

  static async getIntegrations(): Promise<Integration[]> {
    const response = await api.get<IntegrationsResponse>(
      API_CONFIG.endpoints.settings.integrations
    );
    // API returns isEnabled/isConfigured — normalize to our Integration shape
    return (response.data || []).map((item) => {
      const raw = item as unknown as Record<string, unknown>;
      return {
        ...item,
        enabled: (raw.enabled ?? raw.isEnabled ?? false) as boolean,
        status: (raw.status as string) || (raw.isEnabled ? 'Active' : 'Inactive'),
      };
    });
  }

  static async updateIntegration(data: UpdateIntegrationData): Promise<Integration> {
    const { id, ...updateData } = data;
    const response = await api.put<Integration>(
      API_CONFIG.endpoints.settings.integration(id),
      updateData
    );
    return response;
  }

  static async getTeamMembers(): Promise<TeamMember[]> {
    const response = await api.get<TeamMembersResponse>(API_CONFIG.endpoints.settings.teams);
    return response.data;
  }

  static async inviteTeamMember(data: InviteTeamMemberData): Promise<TeamMember> {
    const response = await api.post<TeamMember>(API_CONFIG.endpoints.settings.teams, data);
    return response;
  }

  static async updateTeamMemberRole(data: UpdateTeamMemberRoleData): Promise<TeamMember> {
    const { id, ...updateData } = data;
    const response = await api.put<TeamMember>(
      API_CONFIG.endpoints.settings.teamMember(id),
      updateData
    );
    return response;
  }

  static async removeTeamMember(id: string): Promise<void> {
    await api.delete(API_CONFIG.endpoints.settings.teamMember(id));
  }

  static async updatePassword(data: UpdatePasswordData): Promise<void> {
    await api.post(API_CONFIG.endpoints.auth.changePassword, data);
  }

  static async toggleTwoFactor(enabled: boolean): Promise<void> {
    await api.post(API_CONFIG.endpoints.settings.twoFactor, { enabled });
  }

  static async getSecuritySettings(): Promise<SecuritySettings> {
    const response = await api.get<SecuritySettingsResponse>(
      API_CONFIG.endpoints.settings.security
    );
    return response.data;
  }

  static async updateSecurity(data: UpdateSecurityData): Promise<SecuritySettings> {
    const response = await api.put<SecuritySettingsResponse>(
      API_CONFIG.endpoints.settings.security,
      data
    );
    return response.data;
  }
}

