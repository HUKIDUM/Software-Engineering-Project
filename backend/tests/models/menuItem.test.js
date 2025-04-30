// backend/tests/models/menuItem.test.js
const mongoose = require('mongoose');
const MenuItem = require('../../models/MenuItem'); // Import the actual model
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

// Set up database connection before all tests
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
});

// Clean up after all tests
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Clean up collections before each test
beforeEach(async () => {
  await MenuItem.deleteMany({});
});

describe('MenuItem Model', () => {
  // Test creation with required fields
  it('should create a valid menu item with all required fields', async () => {
    const menuItemData = {
      name: 'Test Coffee',
      price: 3.50,
      category: 'Drink',
    };
    const menuItem = new MenuItem(menuItemData);
    await menuItem.save();

    const foundItem = await MenuItem.findOne({ name: 'Test Coffee' });
    expect(foundItem).toBeTruthy();
    expect(foundItem.name).toBe('Test Coffee');
    expect(foundItem.price).toBe(3.50);
    expect(foundItem.category).toBe('Drink');
    expect(foundItem.isAvailable).toBe(true); // Default value
    expect(foundItem.description).toBe(''); // Default value
    expect(foundItem.createdAt).toBeInstanceOf(Date);
  });

  // Test creation with all fields
  it('should create a valid menu item with all fields', async () => {
    const menuItemData = {
      name: 'Test Latte',
      description: 'A hot cup of latte',
      price: 4.50,
      category: 'Drink',
      isAvailable: false,
    };
    const menuItem = new MenuItem(menuItemData);
    await menuItem.save();

    const foundItem = await MenuItem.findOne({ name: 'Test Latte' });
    expect(foundItem).toBeTruthy();
    expect(foundItem.name).toBe('Test Latte');
    expect(foundItem.description).toBe('A hot cup of latte');
    expect(foundItem.price).toBe(4.50);
    expect(foundItem.category).toBe('Drink');
    expect(foundItem.isAvailable).toBe(false);
  });

  // Test required field validation
  it('should be invalid if required fields are missing', async () => {
    const menuItem = new MenuItem({}); // No data provided
    let err;
    try {
      await menuItem.validate();
    } catch (error) {
      err = error;
    }
    expect(err).toBeDefined();
    expect(err.errors.name).toBeDefined();
    expect(err.errors.price).toBeDefined();
    expect(err.errors.category).toBeDefined();
  });

  // Test name validation
  it('should be invalid if name is missing', async () => {
    const menuItem = new MenuItem({
      price: 3.50,
      category: 'Drink',
    });
    let err;
    try {
      await menuItem.validate();
    } catch (error) {
      err = error;
    }
    expect(err).toBeDefined();
    expect(err.errors.name).toBeDefined();
  });

  // Test price validation
  it('should be invalid if price is missing', async () => {
    const menuItem = new MenuItem({
      name: 'Test Coffee',
      category: 'Drink',
    });
    let err;
    try {
      await menuItem.validate();
    } catch (error) {
      err = error;
    }
    expect(err).toBeDefined();
    expect(err.errors.price).toBeDefined();
  });

  // Test category validation
  it('should be invalid if category is missing', async () => {
    const menuItem = new MenuItem({
      name: 'Test Coffee',
      price: 3.50,
    });
    let err;
    try {
      await menuItem.validate();
    } catch (error) {
      err = error;
    }
    expect(err).toBeDefined();
    expect(err.errors.category).toBeDefined();
  });

  // Test negative price validation
  it('should be invalid if price is negative', async () => {
    const menuItemData = {
      name: 'Invalid Item',
      price: -5.00, // Negative price
      category: 'Snack',
    };
    const menuItem = new MenuItem(menuItemData);
    let err;
    try {
      await menuItem.validate();
    } catch (error) {
      err = error;
    }
    expect(err).toBeDefined();
    expect(err.errors.price).toBeDefined();
    expect(err.errors.price.kind).toBe('min');
  });

  // Test zero price is allowed
  it('should allow price to be zero', async () => {
    const menuItemData = {
      name: 'Free Item',
      price: 0, // Zero price
      category: 'Promo',
    };
    const menuItem = new MenuItem(menuItemData);
    let err;
    try {
      await menuItem.validate();
    } catch (error) {
      err = error;
    }
    expect(err).toBeUndefined(); // No validation error
    
    // Save and verify
    await menuItem.save();
    const savedItem = await MenuItem.findOne({ name: 'Free Item' });
    expect(savedItem).toBeTruthy();
    expect(savedItem.price).toBe(0);
  });

  // Test trim functionality
  it('should trim whitespace from name and category', async () => {
    const menuItemData = {
      name: '  Espresso  ',
      price: 2.50,
      category: '  Hot Drinks  ',
      description: '  Strong coffee  ',
    };
    const menuItem = new MenuItem(menuItemData);
    await menuItem.save();

    const savedItem = await MenuItem.findOne({ name: 'Espresso' });
    expect(savedItem).toBeTruthy();
    expect(savedItem.name).toBe('Espresso'); // Trimmed
    expect(savedItem.category).toBe('Hot Drinks'); // Trimmed
    expect(savedItem.description).toBe('Strong coffee'); // Trimmed
  });

  // Test default value for isAvailable
  it('should default isAvailable to true if not provided', async () => {
    const menuItemData = {
      name: 'Test Muffin',
      price: 2.75,
      category: 'Food',
    };
    const menuItem = new MenuItem(menuItemData);
    expect(menuItem.isAvailable).toBe(true);
    
    await menuItem.save();
    const savedItem = await MenuItem.findOne({ name: 'Test Muffin' });
    expect(savedItem.isAvailable).toBe(true);
  });

  // Test default value for description
  it('should default description to empty string if not provided', async () => {
    const menuItemData = {
      name: 'Plain Bagel',
      price: 1.50,
      category: 'Food',
    };
    const menuItem = new MenuItem(menuItemData);
    expect(menuItem.description).toBe('');
    
    await menuItem.save();
    const savedItem = await MenuItem.findOne({ name: 'Plain Bagel' });
    expect(savedItem.description).toBe('');
  });

  // Test default value for createdAt
  it('should set createdAt to current date by default', async () => {
    const now = Date.now();
    const menuItemData = {
      name: 'Fresh Item',
      price: 5.00,
      category: 'New',
    };
    const menuItem = new MenuItem(menuItemData);
    await menuItem.save();
    
    const savedItem = await MenuItem.findOne({ name: 'Fresh Item' });
    expect(savedItem.createdAt).toBeInstanceOf(Date);
    expect(savedItem.createdAt.getTime()).toBeGreaterThanOrEqual(now - 1000); // Within 1 second
    expect(savedItem.createdAt.getTime()).toBeLessThanOrEqual(now + 1000);
  });
}); 