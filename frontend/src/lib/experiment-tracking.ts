/**
 * Experiment tracking utilities.
 *
 * Provides functions for tracking experiment exposure and conversion events.
 * - Exposure events are deduplicated per session per experiment
 * - Conversion events are linked to experiments for A/B analysis
 */

import { useSession } from 'next-auth/react';
import { useEffect, useRef } from 'react';

import { useExperimentVariant } from '@/providers/feature-flags-provider';

const EXPOSURE_ENDPOINT = '/api/analytics/exposure/';
const CONVERSION_ENDPOINT = '/api/analytics/conversion/';

const exposedExperiments = new Set<string>();

let sessionId: string | null = null;

function getSessionId(): string {
  if (sessionId) return sessionId;

  if (typeof window === 'undefined') {
    return '';
  }

  const stored = sessionStorage.getItem('experiment_session_id');
  if (stored) {
    sessionId = stored;
    return stored;
  }

  sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  sessionStorage.setItem('experiment_session_id', sessionId);
  return sessionId;
}

function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
}

async function sendEvent(endpoint: string, data: Record<string, unknown>): Promise<void> {
  try {
    await fetch(`${getApiBaseUrl()}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch (error) {
    // Log in development to help debug configuration issues
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Analytics] Failed to send event:', endpoint, error);
    }
    // Silently fail in production - analytics should not break the app
  }
}

export function trackExposure(experimentName: string, variant: string, userId?: string): void {
  const key = `${experimentName}:${userId || 'anonymous'}`;

  if (exposedExperiments.has(key)) return;
  exposedExperiments.add(key);

  sendEvent(EXPOSURE_ENDPOINT, {
    experiment: experimentName,
    variant,
    session_id: getSessionId(),
  });
}

export type ConversionMetric = 'click' | 'booking' | 'checkout_success' | 'checkout_abandon';

export function trackConversion(
  experimentName: string,
  variant: string,
  metric: ConversionMetric,
  metadata?: Record<string, unknown>
): void {
  sendEvent(CONVERSION_ENDPOINT, {
    experiment: experimentName,
    variant,
    metric,
    metadata: metadata || {},
  });
}

export function useExposureTracking(experimentName: string, variant: string): void {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;

    tracked.current = true;
    trackExposure(experimentName, variant, userId);
  }, [experimentName, variant, userId]);
}

export function useExperimentWithTracking(experimentName: string): {
  variant: string;
  trackClick: (metadata?: Record<string, unknown>) => void;
  trackBooking: (metadata?: Record<string, unknown>) => void;
  trackCheckoutSuccess: (metadata?: Record<string, unknown>) => void;
  trackCheckoutAbandon: (metadata?: Record<string, unknown>) => void;
} {
  const variant = useExperimentVariant(experimentName);

  useExposureTracking(experimentName, variant);

  return {
    variant,
    trackClick: (metadata) => trackConversion(experimentName, variant, 'click', metadata),
    trackBooking: (metadata) => trackConversion(experimentName, variant, 'booking', metadata),
    trackCheckoutSuccess: (metadata) =>
      trackConversion(experimentName, variant, 'checkout_success', metadata),
    trackCheckoutAbandon: (metadata) =>
      trackConversion(experimentName, variant, 'checkout_abandon', metadata),
  };
}

export function clearExposureCache(): void {
  exposedExperiments.clear();
}
