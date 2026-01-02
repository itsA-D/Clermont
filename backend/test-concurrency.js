import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

/**
 * Concurrency Test Script
 * 
 * This script tests the system's ability to handle concurrent subscription purchases
 * and verify that capacity constraints are properly enforced.
 * 
 * Prerequisites:
 * 1. Backend server running on port 3000
 * 2. Database initialized with schema
 * 3. A plan with limited capacity (e.g., 5 slots)
 * 4. Multiple customers created
 */

// Configuration
const PLAN_CAPACITY = 5;
const CONCURRENT_REQUESTS = 10;

async function createTestPlan() {
    try {
        const response = await axios.post(`${API_URL}/plans`, {
            name: 'Concurrency Test Plan',
            description: 'Plan for testing concurrent purchases',
            price: 9.99,
            duration_days: 30,
            total_capacity: PLAN_CAPACITY
        });
        console.log(`✓ Created test plan with ID: ${response.data.id}`);
        console.log(`  Capacity: ${PLAN_CAPACITY} slots\n`);
        return response.data.id;
    } catch (error) {
        console.error('✗ Failed to create plan:', error.response?.data?.error || error.message);
        process.exit(1);
    }
}

async function createTestCustomers(count) {
    const customerIds = [];

    console.log(`Creating ${count} test customers...`);

    for (let i = 0; i < count; i++) {
        try {
            const response = await axios.post(`${API_URL}/customers`, {
                email: `test-user-${Date.now()}-${i}@example.com`,
                name: `Test User ${i + 1}`
            });
            customerIds.push(response.data.id);
        } catch (error) {
            console.error(`✗ Failed to create customer ${i + 1}:`, error.response?.data?.error || error.message);
        }
    }

    console.log(`✓ Created ${customerIds.length} customers\n`);
    return customerIds;
}

async function purchaseSubscription(customerId, planId, customerIndex) {
    const startTime = Date.now();

    try {
        const response = await axios.post(`${API_URL}/subscriptions`, {
            customerId,
            planId
        });
        const duration = Date.now() - startTime;
        console.log(`✓ Customer ${customerIndex + 1}: SUCCESS (${duration}ms)`);
        return { success: true, duration, customerId };
    } catch (error) {
        const duration = Date.now() - startTime;
        const errorMsg = error.response?.data?.error || error.message;
        console.log(`✗ Customer ${customerIndex + 1}: FAILED - ${errorMsg} (${duration}ms)`);
        return { success: false, duration, customerId, error: errorMsg };
    }
}

async function verifyPlanCapacity(planId) {
    try {
        const response = await axios.get(`${API_URL}/plans/${planId}`);
        return response.data.remaining_capacity;
    } catch (error) {
        console.error('Failed to verify plan capacity:', error.message);
        return null;
    }
}

async function runConcurrencyTest() {
    console.log('='.repeat(60));
    console.log('CONCURRENCY TEST');
    console.log('='.repeat(60));
    console.log(`Testing ${CONCURRENT_REQUESTS} concurrent purchases for a plan with ${PLAN_CAPACITY} capacity\n`);

    // Step 1: Create test plan
    const planId = await createTestPlan();

    // Step 2: Create test customers
    const customerIds = await createTestCustomers(CONCURRENT_REQUESTS);

    if (customerIds.length < CONCURRENT_REQUESTS) {
        console.error('Not enough customers created. Exiting.');
        process.exit(1);
    }

    // Step 3: Execute concurrent purchases
    console.log('Executing concurrent purchase requests...\n');
    const startTime = Date.now();

    const results = await Promise.all(
        customerIds.map((customerId, index) =>
            purchaseSubscription(customerId, planId, index)
        )
    );

    const totalDuration = Date.now() - startTime;

    // Step 4: Analyze results
    console.log('\n' + '='.repeat(60));
    console.log('RESULTS');
    console.log('='.repeat(60));

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`Total requests: ${CONCURRENT_REQUESTS}`);
    console.log(`Successful: ${successful.length}`);
    console.log(`Failed: ${failed.length}`);
    console.log(`Total time: ${totalDuration}ms`);
    console.log(`Average time per request: ${(results.reduce((sum, r) => sum + r.duration, 0) / results.length).toFixed(2)}ms`);

    // Verify capacity
    const remainingCapacity = await verifyPlanCapacity(planId);
    console.log(`\nPlan remaining capacity: ${remainingCapacity}`);

    // Validate test expectations
    console.log('\n' + '='.repeat(60));
    console.log('VALIDATION');
    console.log('='.repeat(60));

    let allTestsPassed = true;

    // Test 1: Exactly PLAN_CAPACITY purchases should succeed
    if (successful.length === PLAN_CAPACITY) {
        console.log(`✓ Test 1 PASSED: Exactly ${PLAN_CAPACITY} purchases succeeded`);
    } else {
        console.log(`✗ Test 1 FAILED: Expected ${PLAN_CAPACITY} successes, got ${successful.length}`);
        allTestsPassed = false;
    }

    // Test 2: Remaining requests should fail
    const expectedFailures = CONCURRENT_REQUESTS - PLAN_CAPACITY;
    if (failed.length === expectedFailures) {
        console.log(`✓ Test 2 PASSED: Exactly ${expectedFailures} purchases failed`);
    } else {
        console.log(`✗ Test 2 FAILED: Expected ${expectedFailures} failures, got ${failed.length}`);
        allTestsPassed = false;
    }

    // Test 3: Remaining capacity should be 0
    if (remainingCapacity === 0) {
        console.log(`✓ Test 3 PASSED: Remaining capacity is 0`);
    } else {
        console.log(`✗ Test 3 FAILED: Expected remaining capacity 0, got ${remainingCapacity}`);
        allTestsPassed = false;
    }

    // Test 4: All failures should be due to capacity
    const capacityErrors = failed.filter(r => r.error === 'Plan is at capacity');
    if (capacityErrors.length === failed.length) {
        console.log(`✓ Test 4 PASSED: All failures due to capacity constraint`);
    } else {
        console.log(`✗ Test 4 FAILED: Some failures not due to capacity`);
        console.log('  Other errors:', failed.filter(r => r.error !== 'Plan is at capacity').map(r => r.error));
        allTestsPassed = false;
    }

    console.log('\n' + '='.repeat(60));
    if (allTestsPassed) {
        console.log('✓ ALL TESTS PASSED - Concurrency handling is correct!');
    } else {
        console.log('✗ SOME TESTS FAILED - Review the results above');
    }
    console.log('='.repeat(60));
}

// Run the test
runConcurrencyTest().catch(error => {
    console.error('Test failed with error:', error.message);
    process.exit(1);
});
