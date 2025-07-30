// netlify/users-create.js
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

const db = admin.firestore(); // Obtenha a instância do Firestore

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Método não permitido' }),
        };
    }

    try {
        const { email, password, displayName } = JSON.parse(event.body);

        // Validação básica
        if (!email || !password || password.length < 6) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Dados inválidos. Email e senha (mínimo 6 caracteres) são obrigatórios.' }),
            };
        }

        // Criar usuário no Firebase Authentication
        const userRecord = await admin.auth().createUser({
            email: email,
            password: password,
            displayName: displayName || email.split('@')[0], // Define um displayName padrão
        });

        // Opcional: Salvar informações adicionais no Firestore
        await db.collection('users').doc(userRecord.uid).set({
            email: userRecord.email,
            displayName: userRecord.displayName,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            // Você pode adicionar outros campos aqui, como role: 'admin'
        });

        return {
            statusCode: 201,
            body: JSON.stringify({
                message: 'Usuário criado com sucesso!',
                uid: userRecord.uid,
                email: userRecord.email
            }),
        };

    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        let errorMessage = 'Erro ao criar usuário.';
        if (error.code === 'auth/email-already-exists') {
            errorMessage = 'Este email já está em uso.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Formato de email inválido.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Senha muito fraca. Mínimo 6 caracteres.';
        }
        return {
            statusCode: 400,
            body: JSON.stringify({ message: errorMessage, error: error.message }),
        };
    }
};