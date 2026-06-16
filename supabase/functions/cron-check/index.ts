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

  if (req.method !== 'POST' && req.method !== 'GET') {
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

    // Get webhook URL from env or body
    let webhookUrl = Deno.env.get('TEAMS_WEBHOOK_URL');
    let body: Record<string, unknown> = {};

    if (req.method === 'POST') {
      body = await req.json().catch(() => ({}));
      if (body.webhook_url) {
        webhookUrl = body.webhook_url as string;
      }
    }

    if (!webhookUrl) {
      return new Response(
        JSON.stringify({ error: 'TEAMS_WEBHOOK_URL not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current time in Brasília
    const brasiliaNow = getBrasiliaTime();
    const dayOfWeek = brasiliaNow.getDay();
    const currentTimeMinutes = brasiliaNow.getHours() * 60 + brasiliaNow.getMinutes();
    const currentTimeStr = `${brasiliaNow.getHours().toString().padStart(2, '0')}:${brasiliaNow.getMinutes().toString().padStart(2, '0')}`;

    console.log(`Checking notifications - Brasília time: ${currentTimeStr}, Day: ${dayOfWeek}`);

    // Get config for today
    const { data: configData, error: configError } = await supabase
      .from('hydration_config')
      .select('*')
      .eq('day_of_week', dayOfWeek)
      .single();

    if (configError) {
      console.error('Config error:', configError);
      return new Response(
        JSON.stringify({ message: 'No configuration for today', day: dayOfWeek, time: currentTimeStr }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const config = configData as HydrationConfig;

    if (!config.enabled || config.times.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Notifications disabled for today', day: dayOfWeek, dayName: ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'][dayOfWeek] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the appropriate time slot
    // Check if current time matches any scheduled time (within 2 minutes tolerance)
    let matchedTime: string | null = null;
    let bottleIndex = 0;

    for (let i = 0; i < config.times.length; i++) {
      const [timeH, timeM] = config.times[i].split(':').map(Number);
      const timeMinutes = timeH * 60 + timeM;
      const diff = Math.abs(currentTimeMinutes - timeMinutes);

      // If within 2 minutes of scheduled time, trigger notification
      if (diff <= 2) {
        matchedTime = config.times[i];
        bottleIndex = i;
        break;
      }

      // Also track current bottle position
      if (currentTimeMinutes >= timeMinutes) {
        bottleIndex = i;
      }
    }

    // Check if we already sent a notification for this time slot today
    if (matchedTime) {
      const todayStr = brasiliaNow.toISOString().split('T')[0];
      const { data: existingLog } = await supabase
        .from('notification_logs')
        .select('id')
        .eq('time_slot', matchedTime)
        .gte('sent_at', `${todayStr}T00:00:00`)
        .lte('sent_at', `${todayStr}T23:59:59`)
        .limit(1);

      if (existingLog && existingLog.length > 0) {
        console.log(`Already sent notification for ${matchedTime} today`);
        return new Response(
          JSON.stringify({ message: 'Already sent notification for this time slot', time: matchedTime }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // If no matched time, check if force mode or return status
    if (!matchedTime && !body.force && body.force !== true) {
      // Return status without sending
      const nextTime = config.times.find(t => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m > currentTimeMinutes;
      });

      return new Response(
        JSON.stringify({
          message: 'No notification scheduled for current time',
          currentTime: currentTimeStr,
          scheduledTimes: config.times,
          nextNotification: nextTime || null,
          currentBottle: bottleIndex + 1,
          totalBottles: config.times.length,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If force mode without matched time, use next time or first time
    if (!matchedTime && body.force) {
      const nextTime = config.times.find(t => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m > currentTimeMinutes;
      });
      matchedTime = nextTime || config.times[config.times.length - 1];

      // Recalculate bottle index
      for (let i = 0; i < config.times.length; i++) {
        if (config.times[i] === matchedTime) {
          bottleIndex = i;
          break;
        }
      }
    }

    if (!matchedTime) {
      return new Response(
        JSON.stringify({ message: 'No time slot available', currentTime: currentTimeStr }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const bottleCurrent = bottleIndex + 1;
    const bottleTotal = config.times.length;
    const consumedMl = bottleCurrent * config.dose_ml;

    // Get unused messages
    const { data: usedMessages } = await supabase
      .from('message_usage')
      .select('message_id');

    const usedIds = new Set(usedMessages?.map((u) => u.message_id) || []);

    const { data: allMessages } = await supabase
      .from('messages')
      .select('*');

    if (!allMessages || allMessages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No messages available' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const unusedMessages = allMessages.filter((m) => !usedIds.has(m.id));

    let selectedMessage: Message;
    if (unusedMessages.length === 0) {
      // Reset usage
      await supabase.from('message_usage').delete().neq('id', 0);
      selectedMessage = allMessages[Math.floor(Math.random() * allMessages.length)];
    } else {
      selectedMessage = unusedMessages[Math.floor(Math.random() * unusedMessages.length)];
    }

    // Send notification
    const result = await sendMessageToTeams(webhookUrl, {
      time: matchedTime,
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
        sent_at: brasiliaNow.toISOString(),
        message_id: selectedMessage.id,
        time_slot: matchedTime,
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
      used_at: brasiliaNow.toISOString(),
      notification_log_id: logResult?.id || null,
    });

    // Update daily progress
    const todayDate = brasiliaNow.toISOString().split('T')[0];
    const { data: todayProgress } = await supabase
      .from('daily_progress')
      .select('*')
      .eq('date', todayDate)
      .single();

    if (todayProgress) {
      await supabase
        .from('daily_progress')
        .update({
          completed_doses: Math.max(todayProgress.completed_doses, bottleCurrent),
          total_ml: Math.max(todayProgress.total_ml, consumedMl),
        })
        .eq('id', todayProgress.id);
    } else {
      await supabase.from('daily_progress').insert({
        date: todayDate,
        completed_doses: bottleCurrent,
        total_ml: consumedMl,
        streak_days: 0,
      });
    }

    return new Response(
      JSON.stringify({
        success: result.success,
        sent_at: currentTimeStr,
        time_slot: matchedTime,
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
    console.error('Error in cron-check:', err);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: err instanceof Error ? err.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
