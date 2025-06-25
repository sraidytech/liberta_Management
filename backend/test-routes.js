// Test if commission routes can be imported without errors
try {
  console.log('Testing commission routes import...');
  
  // Test commission controller import
  const { CommissionController } = require('./dist/modules/commissions/commission.controller.js');
  console.log('✓ CommissionController imported successfully');
  
  // Test commission service import
  const { commissionService } = require('./dist/services/commission.service.js');
  console.log('✓ Commission service imported successfully');
  
  // Test commission routes import
  const commissionRoutes = require('./dist/modules/commissions/commission.routes.js');
  console.log('✓ Commission routes imported successfully');
  
  console.log('All commission modules imported successfully!');
  
} catch (error) {
  console.error('Error importing commission modules:', error);
}