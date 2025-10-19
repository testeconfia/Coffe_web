// Configuração do Mercado Pago
export const MERCADO_PAGO_CONFIG = {
  publicKey: process.env.EXPO_PUBLIC_MERCADO_PAGO_PUBLIC_KEY || '',
  accessToken: process.env.EXPO_PUBLIC_MERCADO_PAGO_ACCESS_TOKEN || '',
  clientId: process.env.EXPO_PUBLIC_MERCADO_PAGO_CLIENT_ID || '',
  clientSecret: process.env.EXPO_PUBLIC_MERCADO_PAGO_CLIENT_SECRET || '',
};
const token = 'APP_USR-2381561789517858-101818-350cb5a8628978d162f900ecd20bbd07-267745032';
// Funções auxiliares para o Mercado Pago
export const createPayment = async (paymentData: any) => {
  try {
    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MERCADO_PAGO_CONFIG.accessToken}`,
      },
      body: JSON.stringify(paymentData),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao criar pagamento:', error);
    throw error;
  }
};

export const getPaymentStatus = async (paymentId: string) => {
  try {
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token || MERCADO_PAGO_CONFIG.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Erro ao obter status do pagamento');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao obter status do pagamento:', error);
    throw error;
  }
};

export const createPreference = async (preferenceData: any) => {
  try {
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer APP_USR-5874249072568848-052123-21e235f828a3ab2fc1f11090d80f92a2-267745032`,
      },
      body: JSON.stringify(preferenceData),
    });

    if (!response.ok) {
      throw new Error('Erro ao criar preferência de pagamento');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao criar preferência:', error);
    throw error;
  }
}; 

// Cria pagamento PIX diretamente via API do Mercado Pago
export const createPixPayment = async (params: {
  transaction_amount: number;
  description: string;
  external_reference: string; // deve ser o ID do doc no Firestore
  notification_url: string;
  payer: { email: string };
  metadata?: Record<string, any>;
  date_of_expiration?: string; // ISO-8601
  idempotencyKey?: string;
}) => {
  try {
    const {
      transaction_amount,
      description,
      external_reference,
      notification_url,
      payer,
      metadata,
      date_of_expiration,
      idempotencyKey,
    } = params;

    const expirationISO = date_of_expiration || new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const idemp = idempotencyKey || `${external_reference}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Idempotency-Key': idemp,
      },
      body: JSON.stringify({
        transaction_amount,
        description,
        payment_method_id: 'pix',
        external_reference,
        notification_url,
        date_of_expiration: expirationISO,
        payer,
        metadata: metadata || {},
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(typeof data === 'string' ? data : JSON.stringify(data));
    }

    return data;
  } catch (error) {
    console.error('Erro ao criar pagamento PIX:', error);
    throw error;
  }
};