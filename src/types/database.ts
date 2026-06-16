export interface Tables {
  messages: {
    id: number;
    content: string;
    reference: string | null;
    category: 'verse' | 'discipline' | 'health' | 'perseverance' | 'work' | 'gratitude' | 'family';
    created_at: string;
  };
  hydration_config: {
    id: number;
    day_of_week: number;
    daily_goal_ml: number;
    dose_ml: number;
    times: string[];
    enabled: boolean;
    created_at: string;
    updated_at: string;
  };
  message_usage: {
    id: number;
    message_id: number;
    used_at: string;
    notification_log_id: number | null;
  };
  notification_logs: {
    id: number;
    sent_at: string;
    message_id: number;
    time_slot: string;
    bottle_current: number;
    bottle_total: number;
    consumed_ml: number;
    goal_ml: number;
    success: boolean;
    error_message: string | null;
    teams_response: string | null;
  };
  daily_progress: {
    id: number;
    date: string;
    completed_doses: number;
    total_ml: number;
    streak_days: number;
    created_at: string;
  };
}

export interface Database {
  public: {
    Tables: Tables;
  };
}

export type Message = Tables['messages'];
export type HydrationConfig = Tables['hydration_config'];
export type MessageUsage = Tables['message_usage'];
export type NotificationLog = Tables['notification_logs'];
export type DailyProgress = Tables['daily_progress'];

export const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'] as const;

export const CATEGORY_LABELS: Record<Message['category'], string> = {
  verse: 'Versículo',
  discipline: 'Disciplina',
  health: 'Saúde',
  perseverance: 'Perseverança',
  work: 'Trabalho',
  gratitude: 'Gratidão',
  family: 'Família',
};
