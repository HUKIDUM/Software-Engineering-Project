import { test } from '@playwright/test';

test('user retries login with correct password and places a food order', async ({ page }) => {
  // Navigate to the homepage
  await page.goto('http://localhost:3000/');

  // Attempt to log in with wrong password
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('orderuser@test.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('123456');
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Retry login with correct password
  await page.getByRole('textbox', { name: 'Password' }).fill('password123');
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Navigate to food menu
  await page.getByRole('link', { name: 'Food Menu' }).click();

  // Add two items
  await page.getByRole('button', { name: '+' }).first().click();
  await page.getByRole('button', { name: '+' }).nth(1).click();

  // Add to order
  await page.getByRole('button', { name: 'Add to Order' }).nth(1).click();
  await page.getByRole('button', { name: 'Add to Order' }).first().click();

  // Place the order
  await page.getByRole('button', { name: 'Place your order' }).click();

  // Pause for visual inspection
  await page.pause();
});
