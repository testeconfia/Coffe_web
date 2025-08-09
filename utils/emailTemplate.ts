export const getEmailTemplate = (): string => {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cafezão da Computação - Recuperação de Senha</title>
    <style>
        /* Reset CSS */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #11181C;
            background: linear-gradient(135deg, #4A2C2A 0%, #2C1810 100%);
            min-height: 100vh;
            padding: 20px;
        }

        /* Container principal */
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: #FFFFFF;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }

        /* Header com gradiente */
        .header {
            background: linear-gradient(135deg, #4A2C2A 0%, #2C1810 100%);
            padding: 40px 30px;
            text-align: center;
            position: relative;
        }

        .logo {
            width: 80px;
            height: 80px;
            background: #8B4513;
            border-radius: 50%;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            z-index: 1;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
            font-size: 40px;
            color: #FFFFFF;
            text-align: center;
            line-height: 1;
        }

        .header-title {
            color: #FFFFFF;
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 10px;
            position: relative;
            z-index: 1;
        }

        .header-subtitle {
            color: #E0E0E0;
            font-size: 16px;
            position: relative;
            z-index: 1;
        }

        /* Conteúdo principal */
        .content {
            padding: 40px 30px;
            background: #FFFFFF;
        }

        .greeting {
            font-size: 24px;
            color: #11181C;
            margin-bottom: 30px;
            text-align: center;
        }

        .password-reset-card {
            background: rgba(139, 69, 19, 0.1);
            border-radius: 15px;
            padding: 25px;
            margin-bottom: 30px;
            border-left: 4px solid #8B4513;
            text-align: center;
        }

        .reset-icon {
            width: 60px;
            height: 60px;
            background: #8B4513;
            border-radius: 50%;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 30px;
            color: #FFFFFF;
        }

        .reset-title {
            font-size: 22px;
            font-weight: bold;
            color: #8B4513;
            margin-bottom: 15px;
        }

        .reset-message {
            font-size: 16px;
            color: #11181C;
            line-height: 1.6;
            margin-bottom: 20px;
        }

        .reset-code {
            background: rgba(255, 255, 255, 0.2);
            border: 2px dashed rgba(139, 69, 19, 0.5);
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
            font-size: 24px;
            font-weight: bold;
            letter-spacing: 3px;
            color: #8B4513;
            font-family: 'Courier New', monospace;
        }

        .reset-instructions {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
            text-align: left;
        }

        .reset-instructions h4 {
            color: #8B4513;
            margin-bottom: 10px;
            font-size: 16px;
        }

        .reset-instructions ol {
            color: #11181C;
            line-height: 1.8;
            padding-left: 20px;
        }

        .reset-instructions li {
            margin-bottom: 8px;
        }

        .security-notice {
            background: rgba(231, 76, 60, 0.1);
            border: 1px solid rgba(231, 76, 60, 0.3);
            border-radius: 10px;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
        }

        .security-notice h4 {
            color: #e74c3c;
            margin-bottom: 8px;
            font-size: 14px;
        }

        .security-notice p {
            color: #11181C;
            font-size: 12px;
            line-height: 1.4;
        }

        .expiry-notice {
            background: rgba(243, 156, 18, 0.1);
            border: 1px solid rgba(243, 156, 18, 0.3);
            border-radius: 10px;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
        }

        .expiry-notice h4 {
            color: #f39c12;
            margin-bottom: 8px;
            font-size: 14px;
        }

        .expiry-notice p {
            color: #11181C;
            font-size: 12px;
            line-height: 1.4;
        }

        /* Seção de estatísticas */
        .stats-section {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 15px;
            padding: 25px;
            margin-bottom: 30px;
        }

        .stats-title {
            font-size: 20px;
            font-weight: bold;
            color: #8B4513;
            margin-bottom: 20px;
            text-align: center;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }

        .stat-card {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            border: 1px solid rgba(139, 69, 19, 0.2);
        }

        .stat-icon {
            font-size: 24px;
            color: #8B4513;
            margin-bottom: 10px;
        }

        .stat-number {
            font-size: 28px;
            font-weight: bold;
            color: #8B4513;
            margin-bottom: 5px;
        }

        .stat-label {
            font-size: 14px;
            color: #A0A0A0;
        }

        /* Botões */
        .button-container {
            text-align: center;
            margin: 30px 0;
        }

        .btn {
            display: inline-block;
            padding: 15px 30px;
            background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%);
            color: #FFFFFF;
            text-decoration: none;
            border-radius: 25px;
            font-weight: bold;
            font-size: 16px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(139, 69, 19, 0.3);
        }

        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(139, 69, 19, 0.4);
        }

        /* Footer */
        .footer {
            background: linear-gradient(135deg, #2C1810 0%, #4A2C2A 100%);
            padding: 30px;
            text-align: center;
            color: #FFFFFF;
        }

        .footer-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 15px;
        }

        .footer-text {
            font-size: 14px;
            color: #E0E0E0;
            line-height: 1.6;
        }

        .social-links {
            margin-top: 20px;
        }

        .social-link {
            display: inline-block;
            width: 40px;
            height: 40px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 50%;
            margin: 0 10px;
            text-decoration: none;
            color: #FFFFFF;
            line-height: 40px;
            transition: all 0.3s ease;
        }

        .social-link:hover {
            background: #8B4513;
            transform: scale(1.1);
        }

        /* Responsividade */
        @media (max-width: 600px) {
            body {
                padding: 10px;
            }

            .email-container {
                border-radius: 15px;
            }

            .header {
                padding: 30px 20px;
            }

            .header-title {
                font-size: 24px;
            }

            .content {
                padding: 30px 20px;
            }

            .stats-grid {
                grid-template-columns: 1fr;
            }

            .btn {
                display: block;
                margin: 10px 0;
                text-align: center;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <!-- Header -->
        <div class="header">
            <div class="logo">☕</div>
            <h1 class="header-title">Cafezão da Computação</h1>
            <p class="header-subtitle">Sistema Inteligente de Café</p>
        </div>

        <!-- Conteúdo Principal -->
        <div class="content">
            <!-- Saudação -->
            <div class="greeting">
                Olá, <strong>{{userName}}</strong>! 👋
            </div>

            <!-- Card de Recuperação de Senha -->
            <div class="password-reset-card">
                <div class="reset-icon">🔐</div>
                <div class="reset-title">Recuperação de Senha</div>
                <div class="reset-message">
                    Recebemos uma solicitação para redefinir sua senha no Cafezão da Computação. 
                    Use o código abaixo para completar o processo:
                </div>
                
                <div class="reset-code">{{resetCode}}</div>
                
                <div class="reset-instructions">
                    <h4>📋 Como usar este código:</h4>
                    <ol>
                        <li>Abra o aplicativo Cafezão da Computação</li>
                        <li>Vá para a tela de "Esqueci minha senha"</li>
                        <li>Digite o código acima no campo indicado</li>
                        <li>Crie uma nova senha segura</li>
                        <li>Confirme a nova senha</li>
                    </ol>
                </div>
                
                <div class="security-notice">
                    <h4>🔒 Aviso de Segurança</h4>
                    <p>
                        Se você não solicitou esta recuperação de senha, ignore este email. 
                        Sua conta permanecerá segura.
                    </p>
                </div>
                
                <div class="expiry-notice">
                    <h4>⏰ Código Temporário</h4>
                    <p>
                        Este código é válido por {{expiryTime}} minutos. 
                        Após esse período, será necessário solicitar um novo código.
                    </p>
                </div>
            </div>            
            <!-- Informações Adicionais -->
            <div class="stats-section">
                <h3 class="stats-title">📞 Precisa de Ajuda?</h3>
                <div class="stats-grid">
                    <div class="stat-card">
                        <a href="mailto:cafezaocomputacao@gmail.com?subject=Recuperação%20de%20Senha%20-%20Cafezão%20da%20Computação&body=Olá,%20preciso%20de%20ajuda%20com%20a%20recuperação%20de%20senha." style="color: #8B4513; text-decoration: none;">
                        <div class="stat-icon">📧</div>
                        <div class="stat-number">Email</div>
                        <div class="stat-label">
                                cafezaocomputacao@gmail.com
                            </div>
                        </a>
                        </div>
                    <div class="stat-card">
                        <a href="https://wa.me/5566999086599?text=Olá!%20Preciso%20de%20ajuda%20com%20a%20recuperação%20de%20senha%20do%20Cafezão%20da%20Computação." style="color: #8B4513; text-decoration: none;">
                        <div class="stat-icon">📱</div>
                        <div class="stat-number">WhatsApp</div>
                        <div class="stat-label">
                                (66) 99908-6599
                        </div>
                    </a>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <h3 class="footer-title">Cafezão da Computação</h3>
            <p class="footer-text">
                Sistema inteligente de café para a comunidade acadêmica.<br>
                Mantendo sua conta segura e acessível.
            </p>
            <div class="social-links">
                <a href="mailto:cafezaocomputacao@gmail.com?subject=Suporte%20-%20Cafezão%20da%20Computação" class="social-link">📧</a>
                <a href="https://wa.me/5566999086599?text=Olá!%20Preciso%20de%20suporte%20do%20Cafezão%20da%20Computação." class="social-link">📱</a>
            </div>
        </div>
    </div>
</body>
</html>`;
}; 