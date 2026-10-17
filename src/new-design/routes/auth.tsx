import { lazy } from 'react';
import { Route } from 'react-router-dom';
import { RequireRole } from '../api/session';

const LoginPage = lazy(() => import('../pages/auth/login'));
const SignupPage = lazy(() => import('../pages/auth/signup'));
const ResetPasswordPage = lazy(() => import('../pages/auth/reset'));
const VerifyEmailPage = lazy(() => import('../pages/auth/verify'));
const VerifyByTokenPage = lazy(() => import('../pages/auth/verify').then((m) => ({ default: m.VerifyByTokenPage })));
const OnboardingPage = lazy(() => import('../pages/auth/onboarding'));

/** Вход, регистрация, подтверждение почты, онбординг. */
export const authRoutes = (
  <>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/signup" element={<SignupPage />} />
    <Route path="/reset-password" element={<ResetPasswordPage />} />
    <Route path="/verify-email" element={<VerifyEmailPage />} />
    <Route path="/auth/verify" element={<VerifyByTokenPage />} />
    <Route path="/onboarding" element={<RequireRole role="student"><OnboardingPage /></RequireRole>} />
  </>
);
