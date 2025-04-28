# Migration Scripts

This directory contains scripts for migrating data between different versions of the database schema.

## Membership Migration

The `migrateMemberships.js` script migrates user membership data from the old embedded structure to the new referenced structure with a separate Membership model.

### When to Run

Run this script once after deploying the updated models that move membership from an embedded document to a referenced document.

### How to Run

1. Ensure your `.env` file has the correct `MONGODB_URI` connection string.
2. Make sure both the old User model and new Membership model are in place.
3. Run the script from the project root:

```bash
node backend/scripts/migrateMemberships.js
```

### What it Does

1. Finds all users with embedded membership data (where `membership` is an object, not an ID reference)
2. Creates a new Membership document for each user using the embedded data
3. Updates the user document with a reference to the new Membership document
4. Prints a summary of the migration results

### Troubleshooting

If the script fails:

1. Check that MongoDB is running and accessible
2. Verify that the models are correctly defined
3. Look at the error messages for specific issues
4. Fix any issues and run the script again - it will skip users that have already been migrated

### Reverting

If you need to revert to the old structure, you would need to create a separate script that does the reverse operation. 