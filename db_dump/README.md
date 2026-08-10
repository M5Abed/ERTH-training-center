# Database Dump

Place your `.sql` database export here. MySQL will auto-import any `.sql` files
in this directory on first startup (when the `db_data` volume is empty).

If no dump is provided, the app's auto-migration in `api/config.php` will create
all necessary tables automatically — you'll just start with an empty database.

## Usage

```bash
# Export from existing database
mysqldump -u USER -p DATABASE_NAME > db_dump/001_schema.sql

# Or simply use the included schema
# 001_schema.sql is already provided
```
