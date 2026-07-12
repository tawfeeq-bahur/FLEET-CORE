#!/usr/bin/env node

/**
 * Script to add sample routes to the database
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
//function for sample Routes
async function addSampleRoutes() {
  log('\n🌱 Adding sample routes to database...', 'cyan');
  
  const sampleRoutes = [
    {
      source: "New York, NY",
      destination: "Boston, MA",
      vehicleType: "Truck",
      vehicleYear: 2023,
      fuelType: "Diesel",
      distance: 200,
      emissions: 45.2,
      routeSource: "OSM",
      routeType: "Highway",
      traffic: "Normal",
      date: new Date('2024-09-10T00:00:00.000Z').toISOString()
    },
    {
      source: "Los Angeles, CA",
      destination: "San Francisco, CA",
      vehicleType: "Van",
      vehicleYear: 2022,
      fuelType: "Gasoline",
      distance: 380,
      emissions: 67.8,
      routeSource: "OSM",
      routeType: "Highway",
      traffic: "Heavy",
      date: new Date('2024-09-12T00:00:00.000Z').toISOString()
    },
    {
      source: "Chicago, IL",
      destination: "Detroit, MI",
      vehicleType: "Truck",
      vehicleYear: 2021,
      fuelType: "Diesel",
      distance: 280,
      emissions: 52.3,
      routeSource: "OSM",
      routeType: "Highway",
      traffic: "Light",
      date: new Date('2024-09-15T00:00:00.000Z').toISOString()
    }
  ];

  let successCount = 0;
  let errorCount = 0;

  for (const route of sampleRoutes) {
    try {
      const response = await fetch(`${BASE_URL}/api/routes/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(route)
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        log(`✅ Added route: ${route.source} → ${route.destination}`, 'green');
        successCount++;
      } else {
        log(`❌ Failed to add route: ${route.source} → ${route.destination}`, 'red');
        log(`   Error: ${data.error || 'Unknown error'}`, 'red');
        errorCount++;
      }
    } catch (error) {
      log(`❌ Network error adding route: ${route.source} → ${route.destination}`, 'red');
      log(`   Error: ${error.message}`, 'red');
      errorCount++;
    }
  }

  return { successCount, errorCount };
}

async function testRoutesAfterAdding() {
  log('\n🔍 Testing routes after adding...', 'cyan');
  
  try {
    const response = await fetch(`${BASE_URL}/api/routes/list`);
    const data = await response.json();
    
    if (data.success) {
      log(`✅ Found ${data.count} routes in database`, 'green');
      if (data.data && data.data.length > 0) {
        data.data.forEach((route, index) => {
          log(`  ${index + 1}. ${route.source} → ${route.destination}`, 'blue');
        });
      }
      return true;
    } else {
      log('❌ Failed to fetch routes after adding', 'red');
      return false;
    }
  } catch (error) {
    log('❌ Error testing routes:', 'red');
    log(error.message, 'red');
    return false;
  }
}

async function main() {
  log('🚀 Add Sample Routes Script', 'bright');
  log('===========================', 'bright');
  
  // Add sample routes
  const { successCount, errorCount } = await addSampleRoutes();
  
  log(`\n📊 Results:`, 'bright');
  log(`✅ Successfully added: ${successCount} routes`, 'green');
  log(`❌ Failed to add: ${errorCount} routes`, errorCount > 0 ? 'red' : 'green');
  
  // Test routes after adding
  const testOk = await testRoutesAfterAdding();
  
  if (testOk && successCount > 0) {
    log('\n🎉 Sample routes added successfully!', 'green');
    log('The routes page should now display the sample routes.', 'blue');
  } else {
    log('\n⚠️  Some issues occurred while adding routes.', 'yellow');
    log('Check the error messages above for details.', 'yellow');
  }
  
  log('\n✨ Script completed!', 'magenta');
}

// Run the script
main().catch(error => {
  log(`\n💥 Script failed with error: ${error.message}`, 'red');
  process.exit(1);
});
