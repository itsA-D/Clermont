import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

async function createPriceForExistingPlan() {
    try {
        // Get all plans
        console.log('Fetching plans...');
        const plansResponse = await axios.get(`${API_URL}/plans`);
        const plans = plansResponse.data;

        console.log('\n=== PLANS ===');
        plans.forEach(plan => {
            console.log(`- ${plan.name} (ID: ${plan.id}, Price: $${plan.price})`);
        });

        // Get all prices
        console.log('\n\nFetching prices...');
        const pricesResponse = await axios.get(`${API_URL}/prices`);
        const prices = pricesResponse.data;

        console.log('\n=== PRICES ===');
        prices.forEach(price => {
            console.log(`- Plan ID: ${price.plan_id}, Amount: $${price.unit_amount / 100}`);
        });

        // Find plans without prices
        const planIdsWithPrices = new Set(prices.map(p => p.plan_id).filter(Boolean));
        const plansWithoutPrices = plans.filter(plan => !planIdsWithPrices.has(plan.id));

        console.log('\n\n=== PLANS WITHOUT PRICES ===');
        if (plansWithoutPrices.length === 0) {
            console.log('All plans have prices!');
            return;
        }

        plansWithoutPrices.forEach(plan => {
            console.log(`- ${plan.name} (ID: ${plan.id})`);
        });

        // Create prices for plans without them
        console.log('\n\nCreating prices for plans without them...');

        // First, get or create the default product
        let productsResponse = await axios.get(`${API_URL}/products`);
        let defaultProduct = productsResponse.data.find(p => p.name === 'Subscription Plans');

        if (!defaultProduct) {
            console.log('Creating default product...');
            const productResponse = await axios.post(`${API_URL}/products`, {
                name: 'Subscription Plans',
                description: 'Auto-generated product for subscription plans',
                active: true
            });
            defaultProduct = productResponse.data;
        }

        for (const plan of plansWithoutPrices) {
            try {
                const priceData = {
                    product_id: defaultProduct.id,
                    plan_id: plan.id,
                    currency: 'usd',
                    unit_amount: Math.round(parseFloat(plan.price) * 100), // Convert to cents
                    recurring_interval: 'month',
                    interval_count: 1,
                    type: 'recurring',
                    active: true
                };

                console.log(`Creating price for plan "${plan.name}"...`);
                const response = await axios.post(`${API_URL}/prices`, priceData);
                console.log(`✓ Created price for "${plan.name}"`);
            } catch (error) {
                console.error(`✗ Failed to create price for "${plan.name}":`, error.response?.data || error.message);
            }
        }

        console.log('\n\nDone!');

    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

createPriceForExistingPlan();
