import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface HydrationConfig {
  day_of_week: number;
  daily_goal_ml: number;
  dose_ml: number;
  times: string[];
  enabled: boolean;
}

interface Message {
  id: number;
  content: string;
  reference: string | null;
  category: string;
}

function getBrasiliaTime(): Date {
  const now = new Date();
  return new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
}

function getCurrentDayOfWeek(): number {
  return getBrasiliaTime().getDay();
}

function getCurrentTime(): string {
  const brasilia = getBrasiliaTime();
  const hours = brasilia.getHours().toString().padStart(2, '0');
  const minutes = brasilia.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function getCurrentBottleIndex(config: HydrationConfig, currentTime: string): number {
  if (!config.enabled) return -1;

  const [currentH, currentM] = currentTime.split(':').map(Number);
  const currentMinutes = currentH * 60 + currentM;

  let currentIndex = -1;
  for (let i = 0; i < config.times.length; i++) {
    const [timeH, timeM] = config.times[i].split(':').map(Number);
    const timeMinutes = timeH * 60 + timeM;
    if (currentMinutes >= timeMinutes) {
      currentIndex = i;
    }
  }

  return currentIndex;
}

async function sendMessageToTeams(webhookUrl: string, message: {
  time: string;
  bottleCurrent: number;
  bottleTotal: number;
  doseMl: number;
  consumedMl: number;
  goalMl: number;
  inspirationalMessage: Message;
}): Promise<{ success: boolean; response?: string; error?: string }> {
  const referenceText = message.inspirationalMessage.reference
    ? `\n\n**${message.inspirationalMessage.reference}**`
    : '';

  const card = {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    "themeColor": "0076D7",
    "summary": "BOLT Hydration Reminder",
    "sections": [{
      "activityTitle": "💧 BOLT HIDRATAÇÃO",
      "facts": [
        { "name": "Horário", "value": message.time },
        { "name": "Garrafa", "value": `${message.bottleCurrent}/${message.bottleTotal}` },
        { "name": "Ação", "value": `□ Buscar água\n□ Beber ${message.doseMl} ml` },
        { "name": "Progresso", "value": `${message.consumedMl} ml / ${message.goalMl} ml` }
      ],
      "text": `_"${message.inspirationalMessage.content}"_${referenceText}`,
      "markdown": true
    }]
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card),
    });

    const responseText = await response.text();
    return {
      success: response.ok,
      response: responseText,
      error: response.ok ? undefined : `HTTP ${response.status}: ${responseText}`,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));

    // Get webhook URL from body (for testing) or from env (production)
    const webhookUrl = body.webhook_url || body.teams_webhook_url || Deno.env.get('TEAMS_WEBHOOK_URL');

    if (!webhookUrl) {
      return new Response(
        JSON.stringify({ error: 'TEAMS_WEBHOOK_URL not provided. Include webhook_url in request body or configure as secret.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const dayOfWeek = getCurrentDayOfWeek();
    const currentTime = getCurrentTime();

    console.log(`Current time (Brasília): ${currentTime}, Day: ${dayOfWeek}`);

    // For testing, allow overriding the day
    const targetDay = body.day_of_week !== undefined ? body.day_of_week : dayOfWeek;

    const { data: configData, error: configError } = await supabase
      .from('hydration_config')
      .select('*')
      .eq('day_of_week', targetDay)
      .single();

    if (configError || !configData) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch hydration config', details: configError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const config = configData as HydrationConfig;

    // For testing, allow using any schedule
    if (body.test === true && config.times.length === 0) {
      const { data: mondayConfig } = await supabase
        .from('hydration_config')
        .select('*')
        .eq('day_of_week', 1)
        .single();

      if (mondayConfig) {
        Object.assign(config, mondayConfig);
      }
    }

    // Determine time slot
    let timeSlot = body.time_slot || '';

    if (!timeSlot && config.times.length > 0) {
      const [currentH, currentM] = currentTime.split(':').map(Number);
      const currentMinutes = currentH * 60 + currentM;

      for (const time of config.times) {
        const [timeH, timeM] = time.split(':').map(Number);
        const timeMinutes = timeH * 60 + timeM;
        const diff = Math.abs(currentMinutes - timeMinutes);

        if (diff <= 30 || (body.test === true)) {
          timeSlot = time;
          break;
        }
      }

      if (!timeSlot) {
        timeSlot = config.times[0];
      }
    }

    if (!timeSlot) {
      timeSlot = currentTime;
    }

    const bottleIndex = body.bottle_index !== undefined ? body.bottle_index : getCurrentBottleIndex(config, timeSlot);
    const bottleCurrent = bottleIndex + 1;
    const bottleTotal = config.times.length > 0 ? config.times.length : 6;
    const consumedMl = bottleCurrent * config.dose_ml;

    const { data: usedMessages, error: usageError } = await supabase
      .from('message_usage')
      .select('message_id');

    const usedIds = new Set(usedMessages?.map((u) => u.message_id) || []);

    const { data: allMessages, error: messagesError } = await supabase
      .from('messages')
      .select('*');

    if (messagesError || !allMessages || allMessages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No messages available' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const unusedMessages = allMessages.filter((m) => !usedIds.has(m.id));

    let selectedMessage: Message;
    if (unusedMessages.length === 0) {
      await supabase.from('message_usage').delete().neq('id', 0);
      selectedMessage = allMessages[Math.floor(Math.random() * allMessages.length)];
    } else {
      selectedMessage = unusedMessages[Math.floor(Math.random() * unusedMessages.length)];
    }

    const result = await sendMessageToTeams(webhookUrl, {
      time: timeSlot,
      bottleCurrent,
      bottleTotal,
      doseMl: config.dose_ml,
      consumedMl,
      goalMl: config.daily_goal_ml,
      inspirationalMessage: selectedMessage,
    });

    // Log the notification
    const { data: logResult } = await supabase
      .from('notification_logs')
      .insert({
        sent_at: getBrasiliaTime().toISOString(),
        message_id: selectedMessage.id,
        time_slot: timeSlot,
        bottle_current: bottleCurrent,
        bottle_total: bottleTotal,
        consumed_ml: consumedMl,
        goal_ml: config.daily_goal_ml,
        success: result.success,
        error_message: result.error || null,
        teams_response: result.response || null,
      })
      .select('id')
      .single();

    // Track message usage
    await supabase.from('message_usage').insert({
      message_id: selectedMessage.id,
      used_at: getBrasiliaTime().toISOString(),
      notification_log_id: logResult?.id || null,
    });

    return new Response(
      JSON.stringify({
        success: result.success,
        time: timeSlot,
        message: selectedMessage,
        bottle: `${bottleCurrent}/${bottleTotal}`,
        progress: `${consumedMl}ml / ${config.daily_goal_ml}ml`,
        error: result.error,
      }),
      {
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('Error in send-notification:', err);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: err instanceof Error ? err.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
