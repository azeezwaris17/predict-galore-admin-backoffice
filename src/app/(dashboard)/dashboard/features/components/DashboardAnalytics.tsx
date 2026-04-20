/**
 * Dashboard Analytics Component
 */

'use client';

import { memo } from 'react';
import Box from '@mui/material/Box';
import { AnalyticsCard } from '@/shared/components/AnalyticsCard';
import { useDashboardSummary } from '@/features/dashboard';
import { designTokens } from '@/shared/styles/tokens';
import { People, Payment, TrendingUp } from '@mui/icons-material';
import { TimeRange } from '@/shared/components/PageHeader';

interface DashboardAnalyticsProps {
  timeRange: TimeRange; // kept for API compatibility, not used for fetching
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DashboardAnalytics = memo(function DashboardAnalytics(_props: DashboardAnalyticsProps) {
  // No date params — same query key as DashboardPageClient, TanStack Query deduplicates to one request
  const { data: summary, isLoading, error } = useDashboardSummary();

  if (!isLoading && !error && (!summary || (
    summary.users?.totalUsers?.currentValue === 0 &&
    summary.payments?.totalPayments?.currentValue === 0 &&
    summary.payments?.totalAmountCurrent === 0
  ))) {
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
          gap: designTokens.spacing.itemGap,
          mb: designTokens.spacing.xl,
        }}
      >
        {[
          { title: 'Total Users', icon: <People /> },
          { title: 'Total Payments', icon: <Payment /> },
          { title: 'Revenue', icon: <TrendingUp /> },
        ].map((item, index) => (
          <Box key={index}>
            <AnalyticsCard
              title={item.title}
              value="No data available"
              change="0.0%"
              loading={false}
              error={false}
              config={{
                title: item.title,
                bgColor: '#F9FAFB',
                textColor: '#6B7280',
                iconColor: '#9CA3AF',
                format: (val: number | undefined) => val?.toString() || 'No data',
              }}
              icon={item.icon}
            />
          </Box>
        ))}
      </Box>
    );
  }

  const cards = [
    {
      key: 'users',
      title: 'Total Users',
      icon: <People />,
      value: summary?.users?.totalUsers?.currentValue || 0,
      change: summary?.users?.totalUsers?.percentageChange || 0,
      bgColor: '#F0F9FF',
      textColor: '#0369A1',
      iconColor: '#0EA5E9',
    },
    {
      key: 'payments',
      title: 'Total Payments',
      icon: <Payment />,
      value: summary?.payments?.totalPayments?.currentValue || 0,
      change: summary?.payments?.totalPayments?.percentageChange || 0,
      bgColor: '#ECFDF5',
      textColor: '#065F46',
      iconColor: '#10B981',
    },
    {
      key: 'revenue',
      title: 'Revenue',
      icon: <TrendingUp />,
      value: summary?.payments?.totalAmountCurrent || 0,
      change: summary?.payments?.amountPercentageChange || 0,
      bgColor: '#FFFBEB',
      textColor: '#92400E',
      iconColor: '#F59E0B',
      format: (val: number | undefined) => `${(val || 0).toLocaleString()}`,
    },
  ];

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
        gap: designTokens.spacing.itemGap,
        mb: designTokens.spacing.xl,
      }}
    >
      {cards.map((card) => (
        <Box key={card.key}>
          <AnalyticsCard
            title={card.title}
            value={card.format ? card.format(card.value) : card.value.toLocaleString()}
            change={`${card.change >= 0 ? '+' : ''}${card.change.toFixed(1)}%`}
            loading={isLoading}
            error={!!error}
            config={{
              title: card.title,
              bgColor: card.bgColor,
              textColor: card.textColor,
              iconColor: card.iconColor,
              format: card.format || ((val: number | undefined) => val?.toLocaleString() || '0'),
            }}
            icon={card.icon}
          />
        </Box>
      ))}
    </Box>
  );
});

DashboardAnalytics.displayName = 'DashboardAnalytics';

export default DashboardAnalytics;
