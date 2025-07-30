// netlify/users-update.js
const admin = require('firebase-admin');

// Inicializa o SDK Admin fora do handler, mas com tratamento de erro robusto
let adminApp;
let adminError;

if (!admin.apps.length) {
    try {
        if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
            throw new Error('A variável de ambiente FIREBASE_SERVICE_ACCOUNT não está definida.');
        }
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        adminApp = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (e) {
        console.error('Falha na inicialização do Firebase Admin SDK:', e);
        adminError = e;
    }
}

const db = admin.apps.length ? admin.firestore() : null;

exports.handler = async (event, context) => {
    // Se a inicialização falhou, retorne um erro 500 imediatamente
    if (adminError) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Erro interno do servidor: Falha na configuração do Firebase.', error: adminError.message })
        };
    }

    if (event.httpMethod !== 'PUT') { // PUT para atualização completa, PATCH para atualização parcial
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Método não permitido' }),
        };
    }

    const { uid, data } = JSON.parse(event.body);

    if (!uid || !data || typeof data !== 'object') {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'UID do usuário e dados para atualização são obrigatórios.' }),
        };
    }

    try {
        // Exemplo: Atualizar displayName no Firebase Authentication (se necessário)
        if (data.displayName) {
            await admin.auth().updateUser(uid, {
                displayName: data.displayName
            });
        }

        // Atualizar documento no Firestore
        await db.collection('users').doc(uid).update(data);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Usuário atualizado com sucesso!' }),
        };

    } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        let errorMessage = 'Erro ao atualizar usuário.';
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'Usuário não encontrado para atualização.';
        }
        return {
            statusCode: 400,
            body: JSON.stringify({ message: errorMessage, error: error.message }),
        };
    }
};