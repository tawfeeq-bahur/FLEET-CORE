#!/usr/bin/env node

/**
 * Setup script for Fleet Management System
 * This script will:
 * 1. Initialize the database
 * 2. Create admin user with username 'admin' and password '123'
 * 3. Test the routes functionality
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:9002';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json();
    return { success: response.ok, data, status: response.status };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testConnection() {
  log('\n🔌 Testing database connection...', 'cyan');
  const result = await makeRequest(`${BASE_URL}/api/test-connection`);
  
  if (result.success) {
    log('✅ Database connection successful', 'green');
    return true;
  } else {
    log('❌ Database connection failed', 'red');
    log(`Error: ${result.error || result.data?.error}`, 'red');
    return false;
  }
}

async function initializeDatabase() {
  log('\n🗄️  Initializing database...', 'cyan');
  const result = await makeRequest(`${BASE_URL}/api/admin/init-db`, {
    method: 'POST'
  });
  
  if (result.success) {
    log('✅ Database initialized successfully', 'green');
    if (result.data.adminDb) {
      log(`   Collections created: ${result.data.adminDb.collections.join(', ')}`, 'blue');
    }
    return true;
  } else {
    log('❌ Database initialization failed', 'red');
    log(`Error: ${result.error || result.data?.error}`, 'red');
    return false;
  }
}

async function createAdminUser() {
  log('\n👤 Creating admin user...', 'cyan');
  const result = await makeRequest(`${BASE_URL}/api/admin/create-admin`, {
    method: 'POST'
  });
  
  if (result.success) {
    log('✅ Admin user created successfully', 'green');
    log(`   Username: admin`, 'blue');
    log(`   Password: 123`, 'blue');
    return true;
  } else {
    log('❌ Admin user creation failed', 'red');
    log(`Error: ${result.error || result.data?.error}`, 'red');
    return false;
  }
}

async function testRoutesEndpoint() {
  log('\n🛣️  Testing routes endpoint...', 'cyan');
  const result = await makeRequest(`${BASE_URL}/api/routes/last`);
  
  if (result.success || result.status === 404) {
    if (result.data && result.data.data) {
      log('✅ Routes endpoint working - found last route', 'green');
      log(`   Route: ${result.data.data.source} → ${result.data.data.destination}`, 'blue');
    } else {
      log('ℹ️  Routes endpoint working - no routes found yet (expected on clean setup)', 'yellow');
    }
    return true;
  } else {
    log('❌ Routes endpoint failed', 'red');
    log(`Error: ${result.error || result.data?.error || 'Unknown HTTP Error'}`, 'red');
    return false;
  }
}

async function seedSampleRoute() {
  log('\n🌱 Seeding sample route...', 'cyan');
  const sampleRoute = {
    source: "New York, NY",
    destination: "Boston, MA",
    vehicleType: "petrol",
    vehicleYear: 2020,
    fuelType: "gasoline",
    distance: 350,
    emissions: 45.5,
    routeSource: "OSM",
    routeType: "highway",
    traffic: "moderate",
    ecoTip: "Consider taking the scenic route through Connecticut for better fuel efficiency"
  };
  
  const result = await makeRequest(`${BASE_URL}/api/routes/save`, {
    method: 'POST',
    body: JSON.stringify(sampleRoute)
  });
  
  if (result.success) {
    log('✅ Sample route created successfully', 'green');
    log(`   Route: ${sampleRoute.source} → ${sampleRoute.destination}`, 'blue');
    return true;
  } else {
    log('❌ Sample route creation failed', 'red');
    log(`Error: ${result.error || result.data?.error}`, 'red');
    return false;
  }
}

async function main() {
  log('🚀 Fleet Management System Setup', 'bright');
  log('================================', 'bright');
  
  // Test connection first
  const connectionOk = await testConnection();
  if (!connectionOk) {
    log('\n❌ Setup failed: Database connection required', 'red');
    process.exit(1);
  }
  
  // Initialize database
  const dbOk = await initializeDatabase();
  if (!dbOk) {
    log('\n❌ Setup failed: Database initialization required', 'red');
    process.exit(1);
  }
  
  // Create admin user
  const adminOk = await createAdminUser();
  if (!adminOk) {
    log('\n❌ Setup failed: Admin user creation required', 'red');
    process.exit(1);
  }
  
  // Test routes endpoint
  const routesOk = await testRoutesEndpoint();
  if (!routesOk) {
    log('\n❌ Setup failed: Routes endpoint not working', 'red');
    process.exit(1);
  }
  
  // Seed sample route
  const sampleOk = await seedSampleRoute();
  if (sampleOk) {
    // Test routes endpoint again to see the sample route
    await testRoutesEndpoint();
  }
  
  log('\n🎉 Setup completed successfully!', 'green');
  log('\n📋 Next steps:', 'bright');
  log('1. Start the development server: npm run dev', 'blue');
  log('2. Open http://localhost:3000 in your browser', 'blue');
  log('3. Login with username: admin, password: 123', 'blue');
  log('4. Navigate to the "Routes" page to see the last assigned route', 'blue');
  log('\n✨ Happy coding!', 'magenta');
}

// Run the setup
main().catch(error => {
  log(`\n💥 Setup failed with error: ${error.message}`, 'red');
  process.exit(1);
});
