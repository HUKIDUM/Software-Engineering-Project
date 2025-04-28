import { test, expect } from '@playwright/test';

test('should edit reservations', async ({ page }) => {
  // Step 1: Navigate to the main page
  await page.goto('http://localhost:3000/');

  // Step 2: Click on the Login link
  await page.getByRole('link', { name: 'Login' }).click();

  // Step 3: Fill in the email and password fields
  await page.getByRole('textbox', { name: 'Email address' }).fill('OwenEatDog@gmail.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('123456');

  // Step 4: Click on the 'Sign in' button
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Step 5: Wait for the page to load after login
  await page.waitForTimeout(2000);  // Wait for the login to complete

  // Step 6: Navigate to the 'Edit your reservations' link
  await page.getByRole('link', { name: 'Edit your reservations' }).click();

  // Step 7: Pause the test and leave the browser open to inspect the result
  await page.pause();  // This will pause the test and allow you to inspect the page
});
