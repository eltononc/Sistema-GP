export async function getMovideskClients() {
    console.log('getMovideskClients started');
    const apiUrl = 'https://api.movidesk.com/public/v1';
    const apiToken = 'cbc0ed6d-656d-4051-be95-a4687aff8f45';

    try {
        const filter = 'profileType eq 3 and isActive eq true';
                const fields = 'isActive,createdDate,businessName,profileType,accessProfile,userName,role,teams,atAssets,createdBy';
        
        console.log('Fetching data from Movidesk API...');
        const response = await fetch(`${apiUrl}/persons?token=${apiToken}&$filter=${encodeURIComponent(filter)}&$select=${fields}`, {
            method: 'GET'
        });
        console.log('Fetch response received:', response.status);

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('Movidesk API error:', errorBody);
            throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
        }

        const clients = await response.json();
        console.log('Successfully fetched and parsed clients:', clients);
        return clients;
    } catch (error) {
        console.error('Erro ao buscar clientes do Movidesk:', error);
        return null;
    }
}

export async function getMovideskDepartments() {
    console.log('getMovideskDepartments started');
    const clients = await getMovideskClients();
    if (!clients) {
        return [];
    }

    const departments = new Set();
    clients.forEach(client => {
        if (client.teams && client.teams.length > 0) {
            client.teams.forEach(team => {
                departments.add(team);
            });
        }
    });

    console.log('Found departments:', Array.from(departments));
    return Array.from(departments);
}

