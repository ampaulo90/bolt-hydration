import { useHydrationData, getNextNotification, getCurrentBottle, getConsumedMl } from './hooks/useHydrationData';
import { Droplets, Clock, Target, MessageSquare, History, TrendingUp, Calendar, CheckCircle2, XCircle, Coffee, Heart, Zap, Shield, Briefcase, Users, Award } from 'lucide-react';

function App() {
  const { todayConfig, messages, recentLogs, todayProgress, usedMessageIds, loading, error } = useHydrationData();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center border border-red-200">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Erro ao carregar</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  const nextNotification = getNextNotification(todayConfig);
  const { current: currentBottle, total: totalBottles } = getCurrentBottle(todayConfig);
  const consumedMl = getConsumedMl(todayConfig, currentBottle);
  const unusedCount = messages.length - usedMessageIds.length;
  const usedCount = usedMessageIds.length;
  const streakDays = todayProgress?.streak_days || 0;

  const categoryStats = messages.reduce((acc, msg) => {
    acc[msg.category] = (acc[msg.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const dayOfWeek = new Date().getDay();
  const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <header className="bg-white/80 backdrop-blur-sm border-b border-blue-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl p-2.5 shadow-lg">
                <Droplets className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  BOLT Hydration
                </h1>
                <p className="text-sm text-gray-500">Free Edition</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>{dayNames[dayOfWeek]}, {new Date().toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {isWeekend && (
          <div className="mb-6 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
            <Coffee className="w-6 h-6 text-emerald-600" />
            <p className="text-emerald-800">Final de semana! Sem notificações programadas. Aproveite seu descanso!</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Meta Diária"
            value={todayConfig?.daily_goal_ml ? `${todayConfig.daily_goal_ml} ml` : '---'}
            subtitle="Quantidade alvo"
            icon={<Target className="w-6 h-6" />}
            color="blue"
          />
          <StatCard
            title="Dose por Garrafa"
            value={todayConfig?.dose_ml ? `${todayConfig.dose_ml} ml` : '---'}
            subtitle="Por notificação"
            icon={<Droplets className="w-6 h-6" />}
            color="cyan"
          />
          <StatCard
            title="Próxima Notificação"
            value={nextNotification || '---'}
            subtitle={nextNotification ? 'Horário de hoje' : 'Sem mais notificações hoje'}
            icon={<Clock className="w-6 h-6" />}
            color="purple"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ProgressCard
            current={consumedMl}
            goal={todayConfig?.daily_goal_ml || 0}
            currentBottle={currentBottle}
            totalBottles={totalBottles}
            dose_ml={todayConfig?.dose_ml || 0}
          />

          <ScheduleCard config={todayConfig} nextNotification={nextNotification} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Mensagens Disponíveis"
            value={unusedCount.toString()}
            subtitle={`de ${messages.length} mensagens`}
            icon={<MessageSquare className="w-6 h-6" />}
            color="green"
          />
          <StatCard
            title="Mensagens Utilizadas"
            value={`${usedCount}/${messages.length}`}
            subtitle={unusedCount > 0 ? `${unusedCount} restantes` : 'Ciclo reiniciará'}
            icon={<History className="w-6 h-6" />}
            color="amber"
          />
          <StatCard
            title="Sequência de Dias"
            value={`${streakDays} dias`}
            subtitle="Consistência"
            icon={<TrendingUp className="w-6 h-6" />}
            color="rose"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <MessagesCard messages={messages} categoryStats={categoryStats} />
          <HistoryCard logs={recentLogs} />
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            Status do Microsoft Teams
          </h3>
          <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-2">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">Microsoft Teams Webhook</p>
              <p className="text-sm text-gray-500">Notificações enviadas via Edge Function</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" />
              Configurado
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-12 py-6 border-t border-gray-200 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
          <p>BOLT Hydration Free Edition - Sistema de notificações inteligentes para hidratação</p>
          <p className="mt-1">Notificações baseadas em horários configuráveis com mensagens inspiracionais cristãs</p>
        </div>
      </footer>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  color: 'blue' | 'cyan' | 'purple' | 'green' | 'amber' | 'rose';
}) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    cyan: 'from-cyan-500 to-cyan-600',
    purple: 'from-purple-500 to-purple-600',
    green: 'from-green-500 to-green-600',
    amber: 'from-amber-500 to-amber-600',
    rose: 'from-rose-500 to-rose-600',
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
        </div>
        <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-xl p-3 text-white shadow-lg`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function ProgressCard({
  current,
  goal,
  currentBottle,
  totalBottles,
  dose_ml,
}: {
  current: number;
  goal: number;
  currentBottle: number;
  totalBottles: number;
  dose_ml: number;
}) {
  const percentage = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Droplets className="w-5 h-5 text-blue-500" />
        Progresso de Hoje
      </h3>

      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Consumido</span>
          <span className="font-medium">{current} / {goal} ml</span>
        </div>
        <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="text-right text-sm text-gray-500 mt-1">{percentage.toFixed(0)}% completo</p>
      </div>

      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl">
        <div className="text-center">
          <p className="text-3xl font-bold text-gray-900">{currentBottle}/{totalBottles}</p>
          <p className="text-sm text-gray-500">Garrafas</p>
        </div>
        <div className="h-12 w-px bg-gray-200" />
        <div className="text-center">
          <p className="text-3xl font-bold text-gray-900">{dose_ml}</p>
          <p className="text-sm text-gray-500">ml por dose</p>
        </div>
      </div>
    </div>
  );
}

function ScheduleCard({
  config,
  nextNotification,
}: {
  config: typeof useHydrationData extends () => infer R ? R['todayConfig'] : never;
  nextNotification: string | null;
}) {
  const dayOfWeek = new Date().getDay();
  const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-cyan-500" />
        Horários de {dayNames[dayOfWeek]}
      </h3>

      {config?.enabled && config.times.length > 0 ? (
        <>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {config.times.map((time, idx) => (
              <div
                key={time}
                className={`text-center py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  time === nextNotification
                    ? 'bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {time}
                {time === nextNotification && (
                  <span className="block text-xs opacity-80">Próximo</span>
                )}
              </div>
            ))}
          </div>
          {nextNotification && (
            <div className="p-3 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl flex items-center gap-2">
              <Clock className="w-5 h-5 text-cyan-600" />
              <span className="text-cyan-800 font-medium">
                Próxima notificação às {nextNotification}
              </span>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Coffee className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Sem notificações programadas para hoje</p>
        </div>
      )}
    </div>
  );
}

function MessagesCard({
  messages,
  categoryStats,
}: {
  messages: typeof useHydrationData extends () => infer R ? R['messages'] : never;
  categoryStats: Record<string, number>;
}) {
  const categoryIcons: Record<string, React.ReactNode> = {
    verse: <Heart className="w-4 h-4" />,
    discipline: <Zap className="w-4 h-4" />,
    health: <Droplets className="w-4 h-4" />,
    perseverance: <Shield className="w-4 h-4" />,
    work: <Briefcase className="w-4 h-4" />,
    gratitude: <Award className="w-4 h-4" />,
    family: <Users className="w-4 h-4" />,
  };

  const categoryColors: Record<string, string> = {
    verse: 'bg-rose-100 text-rose-700',
    discipline: 'bg-amber-100 text-amber-700',
    health: 'bg-green-100 text-green-700',
    perseverance: 'bg-purple-100 text-purple-700',
    work: 'bg-blue-100 text-blue-700',
    gratitude: 'bg-pink-100 text-pink-700',
    family: 'bg-teal-100 text-teal-700',
  };

  const categoryLabels: Record<string, string> = {
    verse: 'Versículos',
    discipline: 'Disciplina',
    health: 'Saúde',
    perseverance: 'Perseverança',
    work: 'Trabalho',
    gratitude: 'Gratidão',
    family: 'Família',
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-green-500" />
        Banco de Mensagens
      </h3>

      <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
        <p className="text-3xl font-bold text-gray-900">{messages.length}</p>
        <p className="text-sm text-gray-500">mensagens inspiracionais</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {Object.entries(categoryStats).map(([category, count]) => (
          <div
            key={category}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg ${categoryColors[category] || 'bg-gray-100'}`}
          >
            {categoryIcons[category]}
            <span className="text-sm font-medium">{categoryLabels[category]}</span>
            <span className="ml-auto text-sm font-bold">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HistoryCard({ logs }: { logs: typeof useHydrationData extends () => infer R ? R['recentLogs'] : never }) {
  if (logs.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <History className="w-5 h-5 text-amber-500" />
          Histórico de Notificações
        </h3>
        <div className="text-center py-8 text-gray-500">
          <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Nenhuma notificação enviada ainda</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <History className="w-5 h-5 text-amber-500" />
        Últimas Notificações
      </h3>

      <div className="space-y-3 max-h-64 overflow-y-auto">
        {logs.map((log) => (
          <div
            key={log.id}
            className={`flex items-center gap-3 p-3 rounded-lg ${
              log.success ? 'bg-green-50' : 'bg-red-50'
            }`}
          >
            <div
              className={`p-2 rounded-lg ${
                log.success ? 'bg-green-500' : 'bg-red-500'
              }`}
            >
              {log.success ? (
                <CheckCircle2 className="w-4 h-4 text-white" />
              ) : (
                <XCircle className="w-4 h-4 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{log.time_slot}</span>
                <span className="text-sm text-gray-500">
                  {log.bottle_current}/{log.bottle_total} garrafas
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {new Date(log.sent_at).toLocaleString('pt-BR')}
              </p>
            </div>
            <div className="text-right text-sm">
              <p className="font-medium text-gray-900">{log.consumed_ml} ml</p>
              <p className="text-gray-500">de {log.goal_ml} ml</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
