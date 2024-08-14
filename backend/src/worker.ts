// src/worker.ts

import { startWorker } from './libs/rabbitmq';
import { handleMessage } from './services/WbotServices/wbotMessageListener';
import { verifyRecentCampaign, verifyCampaignMessageAndCloseTicket } from './services/WbotServices/wbotMessageListener';
import { getWbot } from './libs/wbot'; // Ajuste o caminho conforme necessário

startWorker(handleMessage, getWbot, verifyRecentCampaign, verifyCampaignMessageAndCloseTicket);
