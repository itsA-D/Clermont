import axios from 'axios';

const API = process.env.API_BASE_URL || 'http://localhost:3000/api';

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

async function createPlan({ name, price = 1.0, duration_days = 1, total_capacity = 3 }) {
  const res = await axios.post(`${API}/plans`, { name, price, duration_days, total_capacity });
  return res.data;
}

async function getPlan(id) {
  const res = await axios.get(`${API}/plans/${id}`);
  return res.data;
}

async function createCustomer(email, name) {
  const res = await axios.post(`${API}/customers`, { email, name });
  return res.data;
}

async function purchase(customerId, planId, idempotencyKey) {
  const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined;
  const res = await axios.post(`${API}/subscriptions`, { customerId, planId }, { headers });
  return res.data;
}

async function runCapacityAndConcurrency() {
  const cap = 3;
  const plan = await createPlan({ name: `Test Cap ${Date.now()}`, total_capacity: cap, duration_days: 1, price: 1.99 });
  const customers = await Promise.all(Array.from({ length: cap + 2 }).map((_,i) => createCustomer(`cap_${Date.now()}_${i}@test.com`, `CapUser${i}`)));
  const tasks = customers.map((c,i) => purchase(c.id, plan.id, `cap-${plan.id}-${i}`));
  const results = await Promise.allSettled(tasks);
  const ok = results.filter(r => r.status === 'fulfilled').length;
  const conflicts = results.filter(r => r.status === 'rejected' && /capacity|409/i.test(String(r.reason))).length;
  const planAfter = await getPlan(plan.id);
  const capacityUsed = plan.total_capacity - planAfter.remaining_capacity;
  const pass = ok === cap && capacityUsed === ok;
  return { name: 'Capacity & Concurrency', pass, details: { ok, conflicts, capacityUsed, expectedOk: cap } };
}

async function runIdempotency() {
  const plan = await createPlan({ name: `Test Idem ${Date.now()}`, total_capacity: 5, duration_days: 1, price: 0.99 });
  const customer = await createCustomer(`idem_${Date.now()}@test.com`, 'IdemUser');
  const key = `idem-${plan.id}-${customer.id}`;
  const first = await purchase(customer.id, plan.id, key);
  const second = await purchase(customer.id, plan.id, key);
  const pass = first.id === second.id;
  return { name: 'Idempotent Purchase', pass, details: { firstId: first.id, secondId: second.id } };
}

async function runChangePlanConcurrency() {
  // This endpoint may be admin-protected depending on env; skip gracefully on 401
  try {
    // Create base and target plans
    const base = await createPlan({ name: `Base ${Date.now()}`, total_capacity: 5, duration_days: 1, price: 1.0 });
    const target = await createPlan({ name: `Target ${Date.now()}`, total_capacity: 1, duration_days: 1, price: 2.0 });
    const c1 = await createCustomer(`chg_${Date.now()}_1@test.com`, 'Changer1');
    const c2 = await createCustomer(`chg_${Date.now()}_2@test.com`, 'Changer2');
    // Purchase base subscriptions
    const s1 = await purchase(c1.id, base.id, `chg-${base.id}-1`);
    const s2 = await purchase(c2.id, base.id, `chg-${base.id}-2`);
    // Concurrently change plan for both to target
    const t1 = axios.post(`${API}/subscriptions/${s1.id}/change-plan`, { targetPlanId: target.id });
    const t2 = axios.post(`${API}/subscriptions/${s2.id}/change-plan`, { targetPlanId: target.id });
    const results = await Promise.allSettled([t1, t2]);
    const ok = results.filter(r => r.status === 'fulfilled').length;
    const capacityErrors = results.filter(r => r.status === 'rejected' && /409/.test(String(r.reason))).length;
    const pass = ok === 1 && capacityErrors === 1;
    return { name: 'Change Plan Concurrency', pass, details: { ok, capacityErrors } };
  } catch (e) {
    if (e.response && e.response.status === 401) {
      return { name: 'Change Plan Concurrency', pass: true, details: { skipped: true, reason: 'Admin auth enabled' } };
    }
    return { name: 'Change Plan Concurrency', pass: false, details: { error: e.message } };
  }
}

async function main() {
  const tests = [runCapacityAndConcurrency, runIdempotency, runChangePlanConcurrency];
  const results = [];
  for (const t of tests) {
    try {
      const res = await t();
      results.push(res);
      console.log(`TEST: ${res.name} -> ${res.pass ? 'PASS' : 'FAIL'}`);
      if (!res.pass) console.log(' Details:', res.details);
    } catch (err) {
      results.push({ name: t.name, pass: false, details: { error: err.message } });
      console.log(`TEST: ${t.name} -> FAIL`, err.message);
    }
  }
  const allPass = results.every(r => r.pass);
  console.log('Summary:', results);
  if (!allPass) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
