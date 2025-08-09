import { getEmailTemplate } from './emailTemplate';
import { CorsConfig, retryWithBackoff, delay, ENV_CONFIG } from './corsConfig';

export interface EmailData {
  userName: string;
  resetCode: string;
  expiryTime: number;
}

export interface EmailRequest {
  remetente: string;
  destinatario: string;
  subject: string;
  message: string;
}

export class EmailService {
  private static readonly SENDER_EMAIL = 'cafezaocomputacao@gmail.com';
  private static readonly API_URL = 'https://send-email.neurelix.com.br/send-email';

  /**
   * Envia email de recuperação de senha com sistema robusto de fallback
   */
  static async sendPasswordResetEmail(
    userEmail: string,
    userName: string,
    resetCode: string,
    expiryMinutes: number = 15
  ): Promise<boolean> {
    try {
      console.log('🚀 Iniciando envio de email para:', userEmail);
      
      const template = getEmailTemplate();
      const emailData: EmailData = { userName, resetCode, expiryTime: expiryMinutes };
      const htmlContent = this.replaceVariables(template, emailData);
      
      const emailRequest: EmailRequest = {
        remetente: this.SENDER_EMAIL,
        destinatario: userEmail,
        subject: 'Recuperação de senha do Cafézão da computação',
        message: htmlContent
      };

      // Tentar métodos na ordem de prioridade
      const fallbacks = CorsConfig.getEmailFallbacks();
      
      for (const fallback of fallbacks) {
        console.log(`🔄 Tentando método: ${fallback.name}`);
        
        let success = false;
        
        switch (fallback.type) {
          case 'service':
            success = await this.tryDirectRequest(emailRequest);
            break;
          case 'proxy':
            success = await this.tryWithCorsProxies(emailRequest);
            break;
          case 'local':
            success = await this.tryLocalDevelopment(emailRequest);
            break;
        }
        
        if (success) {
          console.log(`✅ Email enviado com sucesso via: ${fallback.name}`);
          return true;
        }
        
        console.log(`❌ Falha no método: ${fallback.name}`);
      }

      console.log('💥 Todos os métodos falharam');
      return false;
      
    } catch (error) {
      console.error('💥 Erro crítico ao enviar email:', error);
      return false;
    }
  }

  /**
   * Tenta fazer a requisição direta para a API
   */
  private static async tryDirectRequest(emailRequest: EmailRequest): Promise<boolean> {
    return retryWithBackoff(async () => {
      try {
        const response = await fetch(this.API_URL, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(emailRequest),
          mode: 'cors'
        });

        if (response.ok) {
          const result = await response.json();
          console.log('📧 Email enviado via API direta:', result);
          return true;
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        console.log('❌ Falha na requisição direta:', error);
        throw error;
      }
    });
  }

  /**
   * Tenta enviar usando proxies CORS
   */
  private static async tryWithCorsProxies(emailRequest: EmailRequest): Promise<boolean> {
    const workingProxies = await CorsConfig.getBestProxy();
    
    if (!workingProxies) {
      console.log('⚠️ Nenhum proxy CORS disponível');
      return false;
    }

    return retryWithBackoff(async () => {
      try {
        const proxyUrl = workingProxies.url + this.API_URL;
        console.log(`🌐 Tentando com proxy: ${workingProxies.name}`);
        
        const response = await fetch(proxyUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(emailRequest)
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`📧 Email enviado via proxy ${workingProxies.name}:`, result);
          return true;
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        console.log(`❌ Falha com proxy ${workingProxies.name}:`, error);
        throw error;
      }
    });
  }

  /**
   * Método para desenvolvimento local
   */
  private static async tryLocalDevelopment(emailRequest: EmailRequest): Promise<boolean> {
    if (!CorsConfig.isDevelopment()) {
      console.log('🚫 Modo local não disponível em produção');
      return false;
    }

    try {
      console.log('🔄 Modo desenvolvimento: Simulando envio de email');
      console.log('📧 Detalhes do email:', {
        para: emailRequest.destinatario,
        assunto: emailRequest.subject,
        código: emailRequest.message.includes('{{resetCode}}') ? '123456' : 'Código gerado'
      });
      
      // Simular delay de envio
      const delayMs = ENV_CONFIG.development.simulateEmailDelay;
      if (delayMs > 0) {
        console.log(`⏳ Simulando delay de ${delayMs}ms...`);
        await delay(delayMs);
      }
      
      console.log('✅ Simulação de envio concluída');
      return true;
      
    } catch (error) {
      console.log('❌ Falha na simulação local:', error);
      return false;
    }
  }

  /**
   * Valida formato do email
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Gera código de reset de 6 dígitos
   */
  static generateResetCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Substitui variáveis no template
   */
  private static replaceVariables(template: string, data: EmailData): string {
    let html = template;
    
    // Substituir variáveis básicas
    html = html.replace(/\{\{userName\}\}/g, data.userName);
    html = html.replace(/\{\{resetCode\}\}/g, data.resetCode);
    html = html.replace(/\{\{expiryTime\}\}/g, data.expiryTime.toString());
    
    // Substituir data atual
    const now = new Date();
    const formattedDate = now.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    html = html.replace(/\{\{currentDate\}\}/g, formattedDate);
    
    return html;
  }

  /**
   * Testa conectividade dos proxies (método público para debugging)
   */
  static async testProxies(): Promise<void> {
    console.log('🧪 Testando conectividade dos proxies CORS...');
    await CorsConfig.testAllProxies();
  }
} 