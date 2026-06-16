import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { HydrationConfig, Message, NotificationLog, DailyProgress } from '../types/database';

interface HydrationData {
  todayConfig: HydrationConfig | null;
  messages: Message[];
  recentLogs: NotificationLog[];
  todayProgress: DailyProgress | null;
  usedMessageIds: number[];
  loading: boolean;
  error: string | null;
}

export function useHydrationData(): HydrationData {
  const [data, setData] = useState<HydrationData>({
    todayConfig: null,
    messages: [],
    recentLogs: [],
    todayProgress: null,
    usedMessageIds: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const todayStr = today.toISOString().split('T')[0];

        const [configResult, messagesResult, logsResult, progressResult, usageResult] = await Promise.all([
          supabase.from('hydration_config').select('*').eq('day_of_week', dayOfWeek).single(),
          supabase.from('messages').select('*').order('id'),
          supabase.from('notification_logs').select('*').order('sent_at', { ascending: false }).limit(10),
          supabase.from('daily_progress').select('*').eq('date', todayStr).single(),
          supabase.from('message_usage').select('message_id').order('used_at', { ascending: false }),
        ]);

        const usedIds = usageResult.data?.map((u) => u.message_id) || [];

        setData({
          todayConfig: configResult.data,
          messages: messagesResult.data || [],
          recentLogs: logsResult.data || [],
          todayProgress: progressResult.data,
          usedMessageIds: usedIds,
          loading: false,
          error: null,
        });
      } catch (err) {
        setData((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        }));
      }
    }

    fetchData();

    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  return data;
}

export function getNextNotification(config: HydrationConfig | null): string | null {
  if (!config || !config.enabled || config.times.length === 0) return null;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (const time of config.times) {
    const [hours, minutes] = time.split(':').map(Number);
    const timeMinutes = hours * 60 + minutes;
    if (timeMinutes > currentMinutes) {
      return time;
    }
  }

  return null;
}

export function getCurrentBottle(config: HydrationConfig | null): { current: number; total: number } {
  if (!config || !config.enabled) return { current: 0, total: 0 };

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  let currentBottle = 0;

  for (const time of config.times) {
    const [hours, minutes] = time.split(':').map(Number);
    const timeMinutes = hours * 60 + minutes;
    if (currentMinutes >= timeMinutes) {
      currentBottle++;
    } else {
      break;
    }
  }

  return { current: currentBottle, total: config.times.length };
}

export function getConsumedMl(config: HydrationConfig | null, currentBottle: number): number {
  if (!config) return 0;
  return currentBottle * config.dose_ml;
}
