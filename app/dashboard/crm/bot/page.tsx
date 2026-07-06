import React from 'react';
import { getBotStatus, getBotStatsAndHistory } from './actions';
import BotDashboardClient from './BotDashboardClient';

export const revalidate = 0; // Disable static rendering

export default async function BotDashboardPage() {
  const botStatus = await getBotStatus();
  const botStats = await getBotStatsAndHistory();

  return (
    <BotDashboardClient
      initialStatus={botStatus}
      initialStats={botStats}
    />
  );
}
