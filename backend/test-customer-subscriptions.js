import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

async function testCustomerSubscriptions() {
    try {
        console.log('Fetching customers...');
        const customersResponse = await axios.get(`${API_URL}/customers`);
        console.log('\n=== CUSTOMERS ===');
        console.log(JSON.stringify(customersResponse.data, null, 2));

        console.log('\n\nFetching all subscriptions...');
        const subscriptionsResponse = await axios.get(`${API_URL}/subscriptions`);
        console.log('\n=== ALL SUBSCRIPTIONS ===');
        console.log(JSON.stringify(subscriptionsResponse.data, null, 2));

        console.log('\n\nFetching all plans...');
        const plansResponse = await axios.get(`${API_URL}/plans`);
        console.log('\n=== ALL PLANS ===');
        console.log(JSON.stringify(plansResponse.data, null, 2));

    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

testCustomerSubscriptions();
