import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// URLs dos webhooks do Discord para diferentes tipos de notificações
const DISCORD_WEBHOOKS = {
  default: 'https://discord.com/api/webhooks/1358649121866780824/MzZs47mlUTbTGVyLa1faSAz_75LGVPD8ByWVFFKt-Oq4GtxTaFMG3JinVg4qyFbqSmk-',
  approved: 'https://discord.com/api/webhooks/1390442367336583349/_iiyt2VWxxSkrAabjSWywFXEr82nY3ciLM_JmKRHbbmUJmYACncUDGfTFVIzyko8Xa7I', // Substitua pela URL do canal de aprovados
  rejected: 'https://discord.com/api/webhooks/1390442367336583349/_iiyt2VWxxSkrAabjSWywFXEr82nY3ciLM_JmKRHbbmUJmYACncUDGfTFVIzyko8Xa7I'  // Substitua pela URL do canal de reprovados
};

const CORS_PROXY = 'https://cors-anywhere.herokuapp.com/';

interface NotificationData {
  id: string;
  title: string;
  city?: string;
  email?: string;
  date: Date;
  time?: string;
  description?: string;
  status: string;
  createdAt: Date;
  discordId?: string;
}

/**
 * Envia uma notificação para o webhook do Discord usando um proxy CORS
 */
export async function sendDiscordNotification(data: NotificationData, webhookType: 'default' | 'approved' | 'rejected' = 'default'): Promise<boolean> {
  const DISCORD_WEBHOOK_URL = DISCORD_WEBHOOKS[webhookType] || DISCORD_WEBHOOKS.default;
  try {
    const formattedDate = format(data.date, "dd/MM/yyyy", { locale: ptBR });
    
    let embed;
    
    if (webhookType === 'approved') {
      // Para aprovados: apenas nome e descrição
      embed = {
        title: "✅ Alistamento aprovado",
        color: 5025616, // Verde
        fields: [
          {
            name: "👤 Nome",
            value: data.title || "Nome não informado"
          },
          {
            name: "📝 Descrição",
            value: data.description || "Sem descrição"
          }
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: "Esquadrilha da Fumaça - FiveM"
        }
      };
    } else if (webhookType === 'rejected') {
      // Para reprovados: apenas o status
      embed = {
        title: "❌ Alistamento reprovado",
        color: 15073536, // Vermelho
        fields: [
          {
            name: "Status",
            value: data.status || "Status não informado"
          }
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: "Esquadrilha da Fumaça - FiveM"
        }
      };
    } else {
      // Comportamento padrão para outros tipos de notificações
      embed = {
        title: data.title || "🛩️ Nova Solicitação de Apresentação",
        color: 3447003, // Azul (padrão)
        fields: [
          {
            name: "📍 Cidade",
            value: data.city || "Não informada",
            inline: true
          },
          {
            name: "📅 Data",
            value: formattedDate,
            inline: true
          },
          {
            name: "⏰ Horário",
            value: data.time || "Não informado",
            inline: true
          },
          {
            name: "📧 Email",
            value: data.email || "Não informado",
            inline: true
          },
          {
            name: "📝 Descrição",
            value: data.description || "Sem descrição"
          }
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: "Esquadrilha da Fumaça - FiveM"
        }
      };
    }

    const payload = {
      embeds: [embed]
    };

    // Método alternativo usando serviço de proxy para contornar CORS
    // ou usando API de backend
    try {
      // Tenta enviar diretamente (pode não funcionar devido ao CORS)
      const directResponse = await fetch(DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (directResponse.ok) {
        console.log('Notificação enviada para o Discord com sucesso (método direto)!');
        return true;
      }
    } catch (directError) {
      console.warn('Erro no método direto, tentando via proxy:', directError);
    }
    
    // Tenta enviar via proxy CORS
    const proxyResponse = await fetch(CORS_PROXY + DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': window.location.origin
      },
      body: JSON.stringify(payload),
    });

    if (!proxyResponse.ok) {
      throw new Error(`Erro ao enviar para o Discord via proxy: ${proxyResponse.statusText}`);
    }
    
    console.log('Notificação enviada para o Discord com sucesso via proxy!');
    return true;
  } catch (error) {
    console.error('Erro ao enviar notificação para o Discord:', error);
    
    // Método de fallback - salvar em localStorage para tentativa posterior
    try {
      const pendingNotifications = JSON.parse(localStorage.getItem('pendingDiscordNotifications') || '[]');
      pendingNotifications.push({
        data,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('pendingDiscordNotifications', JSON.stringify(pendingNotifications));
      console.log('Notificação salva para tentativa posterior');
    } catch (storageError) {
      console.error('Erro ao salvar notificação para tentativa posterior:', storageError);
    }
    
    return false;
  }
}

/**
 * Tenta reenviar todas as notificações pendentes armazenadas no localStorage
 */
export async function retryPendingNotifications(): Promise<number> {
  try {
    const pendingNotifications = JSON.parse(localStorage.getItem('pendingDiscordNotifications') || '[]');
    if (pendingNotifications.length === 0) {
      return 0;
    }
    
    console.log(`Tentando reenviar ${pendingNotifications.length} notificações pendentes...`);
    
    let successCount = 0;
    const remaining = [];
    
    for (const item of pendingNotifications) {
      try {
        const sent = await sendDiscordNotification(item.data);
        if (sent) {
          successCount++;
        } else {
          remaining.push(item);
        }
      } catch (error) {
        console.error('Erro ao reenviar notificação:', error);
        remaining.push(item);
      }
    }
    
    localStorage.setItem('pendingDiscordNotifications', JSON.stringify(remaining));
    
    console.log(`Reenviadas com sucesso: ${successCount}. Pendentes: ${remaining.length}`);
    return successCount;
  } catch (error) {
    console.error('Erro ao processar notificações pendentes:', error);
    return 0;
  }
} 
