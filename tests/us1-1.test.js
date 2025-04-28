import { test, expect } from '@playwright/test';

test('should specify equipment requirements during booking', async ({ page }) => {
  // Step 1: Navigate to the main page
  await page.goto('http://localhost:3000/');  // Your app URL

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

  // Step 5: Navigate to the 'Spaces' page
  await page.getByRole('link', { name: 'Spaces', exact: true }).click();
  await page.waitForTimeout(1000);  // Wait for spaces to load

  // Step 6: Choose the 8th space to book
  await page.locator('div:nth-child(8) > div > .absolute > .inline-flex').click();
  await page.waitForTimeout(1000);  // Wait for the space details to load

  // Step 7: Select the date (start with today)
  const datePicker = await page.getByRole('textbox', { name: 'Select Date' });
  await datePicker.fill('2025-05-02');  // Start with a fixed date
  await page.waitForTimeout(1000);  // Wait for the date picker to update

  // Step 8: Try to find an available time slot
  const timeButtons = [
    ':00 - 21:00',
    ':00 - 15:00',
    ':00 - 18:00',
    ':00 - 21:00'
  ];

  let timeSlotSelected = false;
  let dateSelected = false;
  let retries = 0;

  // Try up to 5 different dates
  while (!timeSlotSelected && retries < 5) {
    console.log(`Trying date: 2025-05-${(2 + retries).toString().padStart(2, '0')}`);
    
    // Change the date if necessary
    const newDate = `2025-05-${(2 + retries).toString().padStart(2, '0')}`;
    await datePicker.fill(newDate);  // Change the date
    await page.waitForTimeout(1000);  // Wait for the new date to be set

    // Loop through time slots and select the first available one
    for (const time of timeButtons) {
      const timeButton = await page.getByRole('button', { name: time });

      // Wait for a short period before checking each button
      await page.waitForTimeout(500);  // 0.5 second delay

      // Check if the button text includes 'Full' (meaning the slot is unavailable)
      const buttonText = await timeButton.textContent();
      if (buttonText && !buttonText.includes('Full')) {
        await timeButton.click();  // Click the first available slot
        timeSlotSelected = true;
        dateSelected = true;  // Successfully selected a time and date
        break;
      }
    }

    retries++;  // Increment the retry counter for the next date
  }

  // If no available slot is found, throw an error (or handle as needed)
  if (!timeSlotSelected) {
    throw new Error('No available time slot found after trying multiple dates.');
  }

  // Step 9: Increase the quantity for different equipment items
  await page.getByRole('button', { name: 'Increase quantity of Projector' }).click();
  await page.getByRole('button', { name: 'Increase quantity of Pen' }).click();
  await page.getByRole('button', { name: 'Increase quantity of monitor' }).click();

  // Step 10: Click the 'Confirm Reservation' button
  await page.getByRole('button', { name: 'Confirm Reservation' }).click();

  // Step 11: Pause the test and leave the browser open to inspect the result
  await page.pause();  // This will pause the test and allow you to inspect the page

  // Optional: Add an assertion here to check if confirmation happens, e.g.:
  // await expect(page).toHaveURL('confirmation-page-url');
  // Or verify any other confirmation element.
});
