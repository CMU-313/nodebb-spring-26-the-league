import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// Custom metrics
const responseTime = new Trend('response_time');
const errorRate = new Rate('error_rate');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users over 30s
    { duration: '1m', target: 10 },   // Hold at 10 users for 1 minute
    { duration: '30s', target: 50 },  // Ramp up to 50 users over 30s
    { duration: '1m', target: 50 },   // Hold at 50 users for 1 minute
    { duration: '30s', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests must complete within 2s
    error_rate: ['rate<0.1'],          // Error rate must be below 10%
  },
};

// Replace with your NodeBB instance URL
const BASE_URL = 'http://17313-team15.s3d.cmu.edu:4567';

export default function () {
  // Test 1: Homepage
  const homeRes = http.get(`${BASE_URL}/`);
  check(homeRes, {
    'homepage status is 200': (r) => r.status === 200,
    'homepage loads in <2s': (r) => r.timings.duration < 2000,
  });
  responseTime.add(homeRes.timings.duration);
  errorRate.add(homeRes.status !== 200);

  sleep(1);

  // Test 2: Categories page
  const categoriesRes = http.get(`${BASE_URL}/categories`);
  check(categoriesRes, {
    'categories status is 200': (r) => r.status === 200,
    'categories loads in <2s': (r) => r.timings.duration < 2000,
  });
  responseTime.add(categoriesRes.timings.duration);
  errorRate.add(categoriesRes.status !== 200);

  sleep(1);

  // Test 3: Recent topics page
  const recentRes = http.get(`${BASE_URL}/recent`);
  check(recentRes, {
    'recent topics status is 200': (r) => r.status === 200,
    'recent topics loads in <2s': (r) => r.timings.duration < 2000,
  });
  responseTime.add(recentRes.timings.duration);
  errorRate.add(recentRes.status !== 200);

  sleep(1);

  // Test 4: API endpoint - get categories
  const apiRes = http.get(`${BASE_URL}/api/categories`, {
    headers: { 'Accept': 'application/json' },
  });
  check(apiRes, {
    'API status is 200': (r) => r.status === 200,
    'API responds in <1s': (r) => r.timings.duration < 1000,
    'API returns JSON': (r) => r.headers['Content-Type'].includes('application/json'),
  });
  responseTime.add(apiRes.timings.duration);
  errorRate.add(apiRes.status !== 200);

  sleep(1);
}