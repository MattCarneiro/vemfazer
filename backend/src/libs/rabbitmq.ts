// src/libs/rabbitmq.ts

import amqp from 'amqplib';

const RABBITMQ_URL = 'amqp://elementttt:hunted123@140.238.190.11:5672/';
const QUEUE_NAME = 'MULTI';

export async function publishToQueue(message: any, chatId: string, companyId: number) {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertQueue(QUEUE_NAME, { 
      durable: true,
      arguments: {
        'x-queue-type': 'quorum'
      }
    });
    
    channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify({ message, chatId, companyId })), { persistent: true });

    console.log("Mensagem enviada para a fila:", message.key.id, "Chat:", chatId, "Empresa:", companyId);
    
    await channel.close();
    await connection.close();
  } catch (error) {
    console.error("Erro ao publicar mensagem na fila:", error);
  }
}

export async function startWorker(handleMessage: Function, getWbot: Function, verifyRecentCampaign: Function, verifyCampaignMessageAndCloseTicket: Function) {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertQueue(QUEUE_NAME, { 
      durable: true,
      arguments: {
        'x-queue-type': 'quorum'
      }
    });
    
    channel.prefetch(1);

    console.log("Aguardando mensagens na fila MULTI");

    let currentChatId: string | null = null;
    let currentCompanyId: number | null = null;

    channel.consume(QUEUE_NAME, async (msg) => {
      if (msg !== null) {
        const { message, chatId, companyId } = JSON.parse(msg.content.toString());

        if ((currentChatId === null && currentCompanyId === null) || (currentChatId === chatId && currentCompanyId === companyId)) {
          currentChatId = chatId;
          currentCompanyId = companyId;

          try {
            const wbot = getWbot(companyId);
            await handleMessage(message, wbot, companyId);
            await verifyRecentCampaign(message, companyId);
            await verifyCampaignMessageAndCloseTicket(message, companyId);

            channel.ack(msg);

            // Se esta foi a última mensagem do chat atual, resetar currentChatId e currentCompanyId
            const pendingMessages = await channel.checkQueue(QUEUE_NAME);
            if (pendingMessages.messageCount === 0) {
              currentChatId = null;
              currentCompanyId = null;
            }
          } catch (error) {
            console.error("Erro ao processar mensagem:", error);
            channel.nack(msg);
          }
        } else {
          // Se a mensagem é de um chat diferente ou empresa diferente, recolocá-la na fila
          channel.nack(msg, false, true);
        }
      }
    });
  } catch (error) {
    console.error("Erro ao iniciar o worker:", error);
  }
}
