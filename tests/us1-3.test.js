import { test, expect } from '@playwright/test';

test('should edit reservation and update equipment quantity', async ({ page }) => {
  // Step 1: Navigate to the main page
  await page.goto('http://localhost:3000/');

  // Add a small delay to ensure the page is loaded
  await page.waitForTimeout(1000);  // 1 second delay

  // Step 2: Click on the Login link
  await page.getByRole('link', { name: 'Login' }).click();
  await page.waitForTimeout(1000);  // Wait for login page to load

  // Step 3: Fill in the email and password fields
  await page.getByRole('textbox', { name: 'Email address' }).fill('OwenEatDog@gmail.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('123456');

  // Step 4: Click on the 'Sign in' button
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForTimeout(2000);  // Wait for login to complete

  // Step 5: Navigate to the 'Edit your reservations' link
  await page.getByRole('link', { name: 'Edit your reservations' }).click();
  await page.waitForTimeout(1000);  // Wait for the reservation page to load

  // Step 6: Click on the 'Edit' button for the second reservation
  await page.getByRole('button', { name: 'Edit' }).nth(1).click();
  await page.waitForTimeout(1000);  // Wait for the reservation details to load

  // Step 7: Increase the quantity for equipment items
  await page.getByRole('button', { name: 'Increase quantity of monitor' }).click();
  await page.getByRole('button', { name: 'Increase quantity of Pen' }).click();

  // Step 8: Click the 'Update' button to save changes
  await page.getByRole('button', { name: 'Update' }).click();

  // Step 9: Pause the test and leave the browser open to inspect the result
  await page.pause();  // This will pause the test and allow you to inspect the page
});
