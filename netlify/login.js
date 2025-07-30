// netlify/login.js
const admin = require('firebase-admin');

// Inicialize o Firebase Admin SDK APENAS SE AINDA NÃO ESTIVER INICIALIZADO
if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (error) {
        console.error("Erro ao inicializar o Firebase Admin SDK:", error);
        // Opcional: handle case where env var is not set or malformed
    }
}

exports.handler = async (event, context) => {
    // Certifique-se de que é uma requisição POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Método não permitido' }),
        };
    }

    try {
        const { email, password } = JSON.parse(event.body);

        // ATENÇÃO: Autenticar diretamente email/senha aqui é GERALMENTE INSEGURO para uso público.
        // A autenticação email/senha é feita via SDK cliente no frontend.
        // Esta função seria para:
        // 1. Validar um ID token do Firebase (após login no cliente)
        // 2. Criar um token de sessão customizado para acesso a recursos protegidos.
        // 3. Realizar autenticação personalizada se você não usar Email/Senha do Firebase diretamente.

        // Exemplo: Verificar um ID Token enviado do cliente
        const idToken = event.headers.authorization ? event.headers.authorization.split('Bearer ')[1] : null;

        if (!idToken) {
            return {
                statusCode: 401,
                body: JSON.stringify({ message: 'Token de autenticação não fornecido.' }),
            };
        }

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;

        // Se o token for válido, você pode buscar dados adicionais do Firestore
        // ou retornar sucesso.
        const userDoc = await admin.firestore().collection('users').doc(uid).get();
        const userData = userDoc.exists ? userDoc.data() : { email: decodedToken.email };

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Login bem-sucedido (token verificado)!',
                user: { uid: uid, email: userData.email, name: userData.name || 'Usuário' }
            }),
        };

    } catch (error) {
        console.error('Erro na função login:', error);
        return {
            statusCode: 401,
            body: JSON.stringify({ message: 'Falha na autenticação ou token inválido.', error: error.message }),
        };
    }
};