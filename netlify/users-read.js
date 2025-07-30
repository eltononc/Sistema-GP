// netlify/users-read.js
const admin = require('firebase-admin');

if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (error) {
        console.error("Erro ao inicializar o Firebase Admin SDK:", error);
    }
}

const db = admin.firestore();

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Método não permitido' }),
        };
    }

    // Geralmente, você lê dados do usuário logado ou dados de outro usuário com permissão.
    // Aqui, vamos ler um usuário pelo UID, que deve ser passado como parâmetro de consulta.
    const { uid } = event.queryStringParameters;

    // Opcional: Verificar se o usuário que fez a requisição tem permissão para ler este UID
    // const requestingUserUid = context.clientContext?.user?.sub; // Netlify Identity UID

    if (!uid) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'UID do usuário é obrigatório.' }),
        };
    }

    try {
        const userDoc = await db.collection('users').doc(uid).get();

        if (!userDoc.exists) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'Usuário não encontrado.' }),
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify(userDoc.data()),
        };

    } catch (error) {
        console.error('Erro ao ler dados do usuário:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Erro interno do servidor ao buscar usuário.', error: error.message }),
        };
    }
};