'use client';

import React, { useState, useCallback, useMemo, memo } from 'react';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import CircularProgress from '@mui/material/CircularProgress';
import MailIcon from '@mui/icons-material/Mail';
import LockIcon from '@mui/icons-material/Lock';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import PersonIcon from '@mui/icons-material/Person';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { AuthCard } from '@/app/(auth)/features/components/AuthCard';
import { ErrorMessage } from '@/app/(auth)/features/components/ErrorMessage';
import { PasswordStrengthIndicator } from '../features/components/PasswordStrengthIndicator';
import { PhoneNumberInput } from '../features/components/PhoneNumberInput';
import {
  registerFormValidation,
  RegisterFormData,
} from '@/features/auth/validations/auth';
import Stack from '@mui/material/Stack';
import { designTokens } from '@/shared/styles/tokens';
import { createLogger } from '@/shared/api';
import { useRegister, useCheckEmailQuery, useAuth } from '@/features/auth';

const logger = createLogger('Auth:Register');

interface ApiError {
  data?: {
    message?: string;
    errors?: Record<string, string>;
  };
  status?: number;
}

function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [apiError, setApiError] = useState<ApiError | null>(null);

  const registerMutation = useRegister();
  const isRegistering = registerMutation.isPending;

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    control,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerFormValidation),
    mode: 'onChange',
    defaultValues: useMemo(() => ({
      firstName: '',
      lastName: '',
      email: '',
      countryCode: '+1',
      phoneNumber: '',
      password: '',
      confirmPassword: '',
      userTypeId: 1,
    }), []),
  });

  // Use useWatch hook
  const email = useWatch({ control, name: 'email' });
  const watchPassword = useWatch({ control, name: 'password' });

  // Email availability check
  const { data: emailCheck } = useCheckEmailQuery(email, {
    skip: !email || !!errors.email,
  });

  const toggleShowPassword = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const toggleShowConfirmPassword = useCallback(() => {
    setShowConfirmPassword((prev) => !prev);
  }, []);

  const handleAgreeToTermsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setAgreeToTerms(e.target.checked);
  }, []);

  const onSubmit = useCallback(async (data: RegisterFormData) => {
    if (!agreeToTerms) {
      toast.error('You must agree to the terms and conditions');
      return;
    }

    if (emailCheck && !emailCheck.available) {
      toast.error('Email is already registered');
      return;
    }

    setApiError(null);

    try {
      const registrationData = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        userTypeId: data.userTypeId,
        phoneNumber: `${data.countryCode}${data.phoneNumber}`,
        password: data.password,
      };

      const result = await registerMutation.mutateAsync(registrationData);

      if (result.token && result.user) {
        // Transform API response user to full User type
        const fullUser = {
          ...result.user,
          permissions: [],
          userTypeId: data.userTypeId,
          fullName: `${result.user.firstName} ${result.user.lastName}`,
        };
        login(result.token, fullUser);
      }

      toast.success('Registration successful! Please verify your email.');
      router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
    } catch (error: unknown) {
      logger.error('Registration failed', { error });
      setApiError(error as ApiError);
      const errObj = error as Record<string, unknown>;
      const data = (errObj.data as Record<string, unknown>) || {};
      const msg =
        (data.error as string) ||
        (data.message as string) ||
        (errObj.message as string) ||
        'Registration failed. Please try again.';
      toast.error(msg);
    }
  }, [agreeToTerms, emailCheck, registerMutation, login, router]);

  const emailHelperText = useMemo(() => {
    return errors.email?.message || (emailCheck && !emailCheck.available ? 'Email is already registered' : '');
  }, [errors.email, emailCheck]);

  return (
    <Box
      sx={{
        overflowY: 'auto',
        maxHeight: '70vh',
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': {
          display: 'none',
        },
        pr: 1,
      }}
    >
      <AuthCard title="Create an Account" subtitle="Join our platform to get started">
        {apiError && <ErrorMessage error={apiError} />}

        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{
            width: '100%',
          }}
        >
          {/* Name Fields */}
          <Stack direction="row" spacing={designTokens.spacing.itemGap} sx={{ mb: designTokens.spacing.sectionGap }}>
            <TextField
              fullWidth
              label="First Name"
              {...register('firstName')}
              error={!!errors.firstName}
              helperText={errors.firstName?.message}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon color="disabled" />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              fullWidth
              label="Last Name"
              {...register('lastName')}
              error={!!errors.lastName}
              helperText={errors.lastName?.message}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon color="disabled" />
                  </InputAdornment>
                ),
              }}
            />
          </Stack>

          {/* Email Field */}
          <TextField
            fullWidth
            label="Email Address"
            type="email"
            {...register('email')}
            error={!!errors.email || (emailCheck && !emailCheck.available)}
            helperText={emailHelperText}
            sx={{ mb: 3 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <MailIcon color="disabled" />
                </InputAdornment>
              ),
            }}
          />

          {/* Phone Number */}
          <PhoneNumberInput
            register={register}
            errors={errors}
            setValue={setValue}
            control={control}
          />

          {/* Password Field */}
          <TextField
            fullWidth
            label="Password"
            type={showPassword ? 'text' : 'password'}
            {...register('password')}
            error={!!errors.password}
            helperText={errors.password?.message}
            sx={{ mb: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon color="disabled" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={toggleShowPassword}
                    edge="end"
                    color="inherit"
                  >
                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <PasswordStrengthIndicator password={watchPassword || ''} />

          {/* Confirm Password Field */}
          <TextField
            fullWidth
            label="Confirm Password"
            type={showConfirmPassword ? 'text' : 'password'}
            {...register('confirmPassword')}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword?.message}
            sx={{ mt: 2, mb: 3 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon color="disabled" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={toggleShowConfirmPassword}
                    edge="end"
                    color="inherit"
                  >
                    {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {/* Terms Agreement */}
          <FormControlLabel
            control={
              <Checkbox
                checked={agreeToTerms}
                onChange={handleAgreeToTermsChange}
                color="primary"
              />
            }
            label={
              <Typography variant="body2">
                I agree to the{' '}
                <Link href="/terms" sx={{ color: 'primary.main' }}>
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" sx={{ color: 'primary.main' }}>
                  Privacy Policy
                </Link>
              </Typography>
            }
            sx={{ mb: 3 }}
          />

          {/* Submit Button */}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={isRegistering || !isValid || !agreeToTerms}
            sx={{ height: 48, mb: 3 }}
          >
            {isRegistering ? <CircularProgress size={24} color="inherit" /> : 'Create Account'}
          </Button>

          {/* Login Link */}
          <Box sx={{ textAlign: 'center', pb: 1 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Already have an account?{' '}
              <Link href="/login" sx={{ color: 'primary.main', fontWeight: 600 }}>
                Log In
              </Link>
            </Typography>
          </Box>
        </Box>
      </AuthCard>
    </Box>
  );
}

export default memo(RegisterPage);
