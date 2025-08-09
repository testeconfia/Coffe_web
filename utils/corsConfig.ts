/**
 * Configuração para contornar problemas de CORS
 * Este arquivo gerencia proxies e métodos alternativos para APIs externas
 */

export interface CorsProxy {
  name: string;
  url: string;
  active: boolean;
  timeout: number;
}

export interface EmailFallback {
  name: string;
  type: 'proxy' | 'service' | 'local';
  priority: number;
}

export class CorsConfig {
  // Proxies CORS ativos e testados
  private static readonly CORS_PROXIES: CorsProxy[] = [
    {
      name: 'CORS Anywhere',
      url: 'https://cors-anywhere.herokuapp.com/',
      active: true,
      timeout: 10000
    },
    {
      name: 'All Origins',
      url: 'https://api.allorigins.win/raw?url=',
      active: true,
      timeout: 8000
    },
    {
      name: 'CORS Proxy IO',
      url: 'https://corsproxy.io/?',
      active: true,
      timeout: 10000
    },
    {
      name: 'Thing Proxy',
      url: 'https://thingproxy.freeboard.io/fetch/',
      active: true,
      timeout: 12000
    }
  ];

  // Serviços de email alternativos
  private static readonly EMAIL_FALLBACKS: EmailFallback[] = [
    {
      name: 'API Original',
      type: 'service',
      priority: 1
    },
    {
      name: 'CORS Proxies',
      type: 'proxy',
      priority: 2
    },
    {
      name: 'Local Development',
      type: 'local',
      priority: 3
    }
  ];

  /**
   * Obtém lista de proxies CORS ativos
   */
  static getActiveProxies(): CorsProxy[] {
    return this.CORS_PROXIES.filter(proxy => proxy.active);
  }

  /**
   * Obtém fallbacks de email ordenados por prioridade
   */
  static getEmailFallbacks(): EmailFallback[] {
    return this.EMAIL_FALLBACKS.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Testa conectividade de um proxy
   */
  static async testProxy(proxy: CorsProxy): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), proxy.timeout);

      const response = await fetch(proxy.url + 'https://httpbin.org/get', {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.log(`Proxy ${proxy.name} falhou:`, error);
      return false;
    }
  }

  /**
   * Testa todos os proxies e retorna os funcionais
   */
  static async testAllProxies(): Promise<CorsProxy[]> {
    console.log('🧪 Testando proxies CORS...');
    
    const workingProxies: CorsProxy[] = [];
    
    for (const proxy of this.CORS_PROXIES) {
      if (proxy.active) {
        const isWorking = await this.testProxy(proxy);
        if (isWorking) {
          workingProxies.push(proxy);
          console.log(`✅ ${proxy.name} funcionando`);
        } else {
          console.log(`❌ ${proxy.name} falhou`);
        }
      }
    }

    console.log(`📊 ${workingProxies.length}/${this.CORS_PROXIES.length} proxies funcionando`);
    return workingProxies;
  }

  /**
   * Obtém o melhor proxy disponível
   */
  static async getBestProxy(): Promise<CorsProxy | null> {
    const workingProxies = await this.testAllProxies();
    return workingProxies.length > 0 ? workingProxies[0] : null;
  }

  /**
   * Verifica se está em modo de desenvolvimento
   */
  static isDevelopment(): boolean {
    return __DEV__ || process.env.NODE_ENV === 'development';
  }

  /**
   * Obtém configuração para requisições
   */
  static getRequestConfig() {
    return {
      timeout: 15000,
      retries: 3,
      retryDelay: 1000
    };
  }
}

// Configurações específicas para diferentes ambientes
export const ENV_CONFIG = {
  development: {
    enableLocalFallback: true,
    simulateEmailDelay: 2000,
    logLevel: 'debug'
  },
  production: {
    enableLocalFallback: false,
    simulateEmailDelay: 0,
    logLevel: 'error'
  }
};

// Função utilitária para delay
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Função para retry com backoff exponencial
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (i === maxRetries - 1) {
        throw lastError;
      }
      
      const delayMs = baseDelay * Math.pow(2, i);
      console.log(`Tentativa ${i + 1} falhou, aguardando ${delayMs}ms...`);
      await delay(delayMs);
    }
  }
  
  throw lastError!;
}; 