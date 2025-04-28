import { test, expect } from '@playwright/test';

test('should edit reservation and decrease equipment quantity to zero', async ({ page }) => {
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

  // Step 5: Navigate to the 'My Reservations' link
  await page.getByRole('link', { name: 'My Reservations' }).click();
  await page.waitForTimeout(1000);  // Wait for the reservations page to load

  // Step 6: Click on the 'Edit' button for the second reservation
  await page.getByRole('button', { name: 'Edit' }).nth(1).click();
  await page.waitForTimeout(1000);  // Wait for the reservation details to load

  // Function to decrease the quantity of an item until it reaches 0
  const decreaseUntilZero = async (itemName) => {
    // Get the current quantity of the item
    const quantityLocator = await page.getByText(/\d+/).first();  // Assuming the quantity is a number
    const quantityText = await quantityLocator.textContent();
    let quantity = parseInt(quantityText, 10);

    // Loop to decrease the quantity until it reaches 0
    while (quantity > 0) {
      const decreaseButton = await page.getByRole('button', { name: `Decrease quantity of ${itemName}` });

      // Check if the button is enabled (not disabled)
      const isButtonEnabled = await decreaseButton.isEnabled();

      if (isButtonEnabled) {
        await decreaseButton.click();  // Click the "Decrease" button if enabled
        await page.waitForTimeout(500);  // Small delay between clicks

        // Wait for and handle any popups that appear (confirmations, alerts)
        page.once('dialog', dialog => {
          console.log(`Dialog message: ${dialog.message()}`);
          dialog.accept().catch(() => {});  // Automatically click "OK" (accept) on the popup
        });

        // After clicking, update the quantity and check again
        const updatedQuantityText = await quantityLocator.textContent();
        quantity = parseInt(updatedQuantityText, 10);  // Update the quantity
      } else {
        // If button is disabled (quantity is 0), break the loop
        break;
      }
    }
  };

  // Step 7: Decrease the quantities of Projector, Pen, and Monitor
  await decreaseUntilZero('Projector');
  await decreaseUntilZero('Pen');
  await decreaseUntilZero('Monitor');

  // Step 8: Click the 'Update' button to save the changes
  await page.getByRole('button', { name: 'Update' }).click();

  // Step 9: Pause the test and leave the browser open to inspect the result
  await page.pause();  // This will pause the test and allow you to inspect the page
});
