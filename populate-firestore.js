
// populate-firestore.js
import { db } from './firebase-config.js';
import { collection, addDoc, setDoc, doc } from 'firebase/firestore';

const appId = "1:569517541701:web:11b31335fca1d5a708562c"; // O mesmo appId usado em departamentos.html

async function populateFirestore() {
  try {
    // Adicionar um departamento de exemplo
    // Usando setDoc com um ID explícito para simular o comportamento do seu sistema
    const departamentoId = "1"; // Exemplo de ID, seu sistema gera IDs sequenciais
    const departamentoRef = doc(collection(db, `artifacts/${appId}/public/data/departments`), departamentoId);
    await setDoc(departamentoRef, {
      id: parseInt(departamentoId),
      name: 'Recursos Humanos',
      manager: 'Maria Silva',
      functions: ['Recrutamento', 'Folha de Pagamento'],
      observations: 'Departamento responsável pela gestão de pessoas.',
      calendarId: 'defaultCalendarId', // Você pode precisar criar um calendário de exemplo primeiro
      workDays: ['segunda', 'terca', 'quarta', 'quinta', 'sexta'],
      workHours: {
        start: '09:00',
        lunchStart: '12:00',
        lunchEnd: '13:00',
        end: '18:00'
      },
      noBreakWeekday: false,
      weekendWorkHours: null,
      noBreakWeekend: false,
      status: 'Ativo',
      createdAt: new Date()
    });
    console.log('Departamento adicionado com ID: ', departamentoId);

    // Adicionar um usuário de exemplo
    const usuarioId = "1"; // Exemplo de ID
    const usuarioRef = doc(collection(db, `artifacts/${appId}/public/data/usuarios`), usuarioId);
    await setDoc(usuarioRef, {
      id: parseInt(usuarioId),
      nome: 'João Silva',
      email: 'joao.silva@example.com',
      senha: 'senhaSegura123', // Em uma aplicação real, a senha deve ser hash
      departamentoId: departamentoId, // Referência ao departamento
      createdAt: new Date()
    });
    console.log('Usuário adicionado com ID: ', usuarioId);

    // Adicionar um evento de calendário de exemplo
    const calendarioId = "1"; // Exemplo de ID
    const calendarioRef = doc(collection(db, `artifacts/${appId}/public/data/calendars`), calendarioId); // Usando 'calendars' conforme departamentos.html
    await setDoc(calendarioRef, {
      id: parseInt(calendarioId),
      name: 'Calendário Padrão', // Usando 'name' conforme departamentos.html
      status: 'Ativo',
      createdAt: new Date()
    });
    console.log('Evento de calendário adicionado com ID: ', calendarioId);

    console.log('Dados iniciais adicionados ao Firestore com sucesso!');
  } catch (e) {
    console.error('Erro ao adicionar documentos: ', e);
  }
}

populateFirestore();
