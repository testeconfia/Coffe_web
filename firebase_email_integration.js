/**
 * Integração do Template de Email com Firebase Functions
 * Cafezão da Computação
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const EmailGenerator = require('./email_generator');

// Inicializar Firebase Admin
admin.initializeApp();

const db = admin.firestore();

/**
 * Função para enviar email de notificação quando uma nova notificação é criada
 */
exports.sendNotificationEmail = functions.firestore
    .document('notifications/{notificationId}')
    .onCreate(async (snap, context) => {
        try {
            const notification = snap.data();
            const emailGen = new EmailGenerator();
            
            // Carregar template
            await emailGen.loadTemplate();
            
            // Buscar dados do usuário
            const userDoc = await db.collection('users').doc(notification.userId).get();
            const userData = userDoc.data();
            
            // Buscar estatísticas do usuário
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const coffeesQuery = await db.collection('coffees')
                .where('userId', '==', notification.userId)
                .where('createdAt', '>=', today)
                .get();
            
            const totalCoffeesQuery = await db.collection('coffees')
                .where('userId', '==', notification.userId)
                .get();
            
            // Buscar transações recentes
            const transactionsQuery = await db.collection('transactions')
                .where('userId', '==', notification.userId)
                .orderBy('createdAt', 'desc')
                .limit(5)
                .get();
            
            const recentTransactions = transactionsQuery.docs.map(doc => ({
                type: doc.data().type,
                amount: doc.data().amount.toFixed(2),
                date: doc.data().createdAt.toDate().toLocaleDateString('pt-BR')
            }));
            
            // Preparar dados para o email
            const emailUserData = {
                name: userData.name || 'Usuário',
                coffeesToday: coffeesQuery.size,
                totalCoffees: totalCoffeesQuery.size,
                subscriptionStatus: userData.subscriptionStatus || 'inactive',
                subscriptionEndDate: userData.subscriptionEndDate ? 
                    userData.subscriptionEndDate.toDate().toLocaleDateString('pt-BR') : null,
                recentTransactions: recentTransactions
            };
            
            const emailNotificationData = {
                type: notification.type || 'info',
                message: notification.message || 'Nova notificação do Cafezão da Computação',
                couponCode: notification.couponCode || null,
                couponDescription: notification.couponDescription || null
            };
            
            // Gerar conteúdo do email
            const htmlContent = emailGen.generateNotificationEmail(emailUserData, emailNotificationData);
            
            // Enviar email
            await emailGen.sendEmail(
                userData.email,
                `Cafezão da Computação - ${notification.title || 'Nova Notificação'}`,
                htmlContent
            );
            
            console.log(`Email enviado com sucesso para ${userData.email}`);
            
        } catch (error) {
            console.error('Erro ao enviar email de notificação:', error);
            throw error;
        }
    });

/**
 * Função para enviar relatório semanal por email
 */
exports.sendWeeklyReportEmail = functions.pubsub
    .schedule('0 9 * * 1') // Toda segunda-feira às 9h
    .timeZone('America/Sao_Paulo')
    .onRun(async (context) => {
        try {
            const emailGen = new EmailGenerator();
            await emailGen.loadTemplate();
            
            // Buscar todos os usuários ativos
            const usersQuery = await db.collection('users')
                .where('subscriptionStatus', '==', 'active')
                .get();
            
            const lastWeek = new Date();
            lastWeek.setDate(lastWeek.getDate() - 7);
            
            for (const userDoc of usersQuery.docs) {
                const userData = userDoc.data();
                
                // Buscar cafés da semana passada
                const weeklyCoffeesQuery = await db.collection('coffees')
                    .where('userId', '==', userDoc.id)
                    .where('createdAt', '>=', lastWeek)
                    .get();
                
                // Calcular estatísticas
                const coffeesThisWeek = weeklyCoffeesQuery.size;
                const averagePerDay = coffeesThisWeek / 7;
                
                // Buscar horário favorito
                const coffeeTimes = weeklyCoffeesQuery.docs.map(doc => 
                    doc.data().createdAt.toDate().getHours()
                );
                
                const favoriteHour = coffeeTimes.length > 0 ? 
                    coffeeTimes.sort((a, b) => 
                        coffeeTimes.filter(v => v === a).length - 
                        coffeeTimes.filter(v => v === b).length
                    ).pop() : 9;
                
                const emailUserData = {
                    name: userData.name || 'Usuário',
                    coffeesToday: 0, // Para relatório semanal, não é relevante
                    totalCoffees: userData.totalCoffees || 0,
                    subscriptionStatus: userData.subscriptionStatus || 'active',
                    subscriptionEndDate: userData.subscriptionEndDate ? 
                        userData.subscriptionEndDate.toDate().toLocaleDateString('pt-BR') : null,
                    weeklyStats: {
                        coffeesThisWeek: coffeesThisWeek,
                        averagePerDay: averagePerDay.toFixed(1),
                        favoriteTime: `${favoriteHour}:00`
                    }
                };
                
                const htmlContent = emailGen.generateWeeklyReportEmail(emailUserData);
                
                await emailGen.sendEmail(
                    userData.email,
                    'Cafezão da Computação - Relatório Semanal',
                    htmlContent
                );
                
                console.log(`Relatório semanal enviado para ${userData.email}`);
            }
            
        } catch (error) {
            console.error('Erro ao enviar relatórios semanais:', error);
            throw error;
        }
    });

/**
 * Função para enviar email de cupom especial
 */
exports.sendCouponEmail = functions.firestore
    .document('coupons/{couponId}')
    .onCreate(async (snap, context) => {
        try {
            const coupon = snap.data();
            const emailGen = new EmailGenerator();
            
            await emailGen.loadTemplate();
            
            // Buscar usuários elegíveis para o cupom
            const usersQuery = await db.collection('users')
                .where('subscriptionStatus', '==', 'active')
                .get();
            
            for (const userDoc of usersQuery.docs) {
                const userData = userDoc.data();
                
                const emailUserData = {
                    name: userData.name || 'Usuário',
                    coffeesToday: userData.coffeesToday || 0,
                    totalCoffees: userData.totalCoffees || 0,
                    subscriptionStatus: userData.subscriptionStatus || 'active',
                    subscriptionEndDate: userData.subscriptionEndDate ? 
                        userData.subscriptionEndDate.toDate().toLocaleDateString('pt-BR') : null,
                    recentTransactions: []
                };
                
                const couponData = {
                    code: coupon.code,
                    description: coupon.description
                };
                
                const htmlContent = emailGen.generateCouponEmail(emailUserData, couponData);
                
                await emailGen.sendEmail(
                    userData.email,
                    'Cafezão da Computação - Cupom Especial!',
                    htmlContent
                );
                
                console.log(`Email de cupom enviado para ${userData.email}`);
            }
            
        } catch (error) {
            console.error('Erro ao enviar emails de cupom:', error);
            throw error;
        }
    });

/**
 * Função para enviar email de lembrete de assinatura
 */
exports.sendSubscriptionReminderEmail = functions.pubsub
    .schedule('0 10 * * *') // Todos os dias às 10h
    .timeZone('America/Sao_Paulo')
    .onRun(async (context) => {
        try {
            const emailGen = new EmailGenerator();
            await emailGen.loadTemplate();
            
            const today = new Date();
            const threeDaysFromNow = new Date();
            threeDaysFromNow.setDate(today.getDate() + 3);
            
            // Buscar usuários com assinatura expirando em 3 dias
            const usersQuery = await db.collection('users')
                .where('subscriptionStatus', '==', 'active')
                .where('subscriptionEndDate', '<=', threeDaysFromNow)
                .get();
            
            for (const userDoc of usersQuery.docs) {
                const userData = userDoc.data();
                
                const emailUserData = {
                    name: userData.name || 'Usuário',
                    coffeesToday: userData.coffeesToday || 0,
                    totalCoffees: userData.totalCoffees || 0,
                    subscriptionStatus: userData.subscriptionStatus || 'active',
                    subscriptionEndDate: userData.subscriptionEndDate ? 
                        userData.subscriptionEndDate.toDate().toLocaleDateString('pt-BR') : null,
                    recentTransactions: []
                };
                
                const notificationData = {
                    type: 'warning',
                    message: 'Sua assinatura expira em 3 dias. Renove agora para continuar aproveitando nossos cafés!'
                };
                
                const htmlContent = emailGen.generateNotificationEmail(emailUserData, notificationData);
                
                await emailGen.sendEmail(
                    userData.email,
                    'Cafezão da Computação - Lembrete de Assinatura',
                    htmlContent
                );
                
                console.log(`Lembrete de assinatura enviado para ${userData.email}`);
            }
            
        } catch (error) {
            console.error('Erro ao enviar lembretes de assinatura:', error);
            throw error;
        }
    });

/**
 * Função para enviar email de boas-vindas
 */
exports.sendWelcomeEmail = functions.firestore
    .document('users/{userId}')
    .onCreate(async (snap, context) => {
        try {
            const userData = snap.data();
            const emailGen = new EmailGenerator();
            
            await emailGen.loadTemplate();
            
            const emailUserData = {
                name: userData.name || 'Usuário',
                coffeesToday: 0,
                totalCoffees: 0,
                subscriptionStatus: userData.subscriptionStatus || 'inactive',
                subscriptionEndDate: null,
                recentTransactions: []
            };
            
            const notificationData = {
                type: 'success',
                message: 'Bem-vindo ao Cafezão da Computação! Estamos felizes em tê-lo conosco.',
                couponCode: 'BEMVINDO2024',
                couponDescription: 'Cupom de boas-vindas: 50% de desconto na primeira assinatura!'
            };
            
            const htmlContent = emailGen.generateNotificationEmail(emailUserData, notificationData);
            
            await emailGen.sendEmail(
                userData.email,
                'Cafezão da Computação - Bem-vindo!',
                htmlContent
            );
            
            console.log(`Email de boas-vindas enviado para ${userData.email}`);
            
        } catch (error) {
            console.error('Erro ao enviar email de boas-vindas:', error);
            throw error;
        }
    });

/**
 * Função para enviar email de confirmação de café
 */
exports.sendCoffeeConfirmationEmail = functions.firestore
    .document('coffees/{coffeeId}')
    .onCreate(async (snap, context) => {
        try {
            const coffee = snap.data();
            const emailGen = new EmailGenerator();
            
            await emailGen.loadTemplate();
            
            // Buscar dados do usuário
            const userDoc = await db.collection('users').doc(coffee.userId).get();
            const userData = userDoc.data();
            
            // Buscar estatísticas atualizadas
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const coffeesQuery = await db.collection('coffees')
                .where('userId', '==', coffee.userId)
                .where('createdAt', '>=', today)
                .get();
            
            const totalCoffeesQuery = await db.collection('coffees')
                .where('userId', '==', coffee.userId)
                .get();
            
            const emailUserData = {
                name: userData.name || 'Usuário',
                coffeesToday: coffeesQuery.size,
                totalCoffees: totalCoffeesQuery.size,
                subscriptionStatus: userData.subscriptionStatus || 'active',
                subscriptionEndDate: userData.subscriptionEndDate ? 
                    userData.subscriptionEndDate.toDate().toLocaleDateString('pt-BR') : null,
                recentTransactions: []
            };
            
            const notificationData = {
                type: 'success',
                message: `Seu café ${coffee.quantity} foi preparado com sucesso! Aproveite!`
            };
            
            const htmlContent = emailGen.generateNotificationEmail(emailUserData, notificationData);
            
            await emailGen.sendEmail(
                userData.email,
                'Cafezão da Computação - Café Preparado!',
                htmlContent
            );
            
            console.log(`Confirmação de café enviada para ${userData.email}`);
            
        } catch (error) {
            console.error('Erro ao enviar confirmação de café:', error);
            throw error;
        }
    });

/**
 * Função para enviar email de recuperação de senha
 */
exports.sendPasswordResetEmail = functions.firestore
    .document('passwordResets/{resetId}')
    .onCreate(async (snap, context) => {
        try {
            const resetData = snap.data();
            const emailGen = new EmailGenerator();
            
            await emailGen.loadTemplate();
            
            // Buscar dados do usuário
            const userDoc = await db.collection('users').doc(resetData.userId).get();
            const userData = userDoc.data();
            
            const emailUserData = {
                name: userData.name || 'Usuário',
                email: userData.email
            };
            
            const resetEmailData = {
                code: resetData.code,
                expiryMinutes: resetData.expiryMinutes || 15
            };
            
            const htmlContent = emailGen.generatePasswordResetEmail(emailUserData, resetEmailData);
            
            await emailGen.sendEmail(
                userData.email,
                'Cafezão da Computação - Recuperação de Senha',
                htmlContent
            );
            
            console.log(`Email de recuperação de senha enviado para ${userData.email}`);
            
        } catch (error) {
            console.error('Erro ao enviar email de recuperação de senha:', error);
            throw error;
        }
    });

module.exports = {
    sendNotificationEmail: exports.sendNotificationEmail,
    sendWeeklyReportEmail: exports.sendWeeklyReportEmail,
    sendCouponEmail: exports.sendCouponEmail,
    sendSubscriptionReminderEmail: exports.sendSubscriptionReminderEmail,
    sendWelcomeEmail: exports.sendWelcomeEmail,
    sendCoffeeConfirmationEmail: exports.sendCoffeeConfirmationEmail,
    sendPasswordResetEmail: exports.sendPasswordResetEmail
}; 