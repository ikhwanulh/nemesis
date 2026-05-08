const { openDatabase } = require("../src/db");

async function migrate() {
  const db = openDatabase();
  
  console.log("Creating packages_sync table...");
  db.exec(`
    CREATE TABLE IF NOT EXISTS packages_sync (
      id_paket TEXT PRIMARY KEY,
      list_data_hash TEXT,
      detail_data_hash TEXT,
      last_announced_date TEXT,
      sync_status TEXT DEFAULT 'pending',
      last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  // Add updated_at column to packages if not exists
  try {
    db.exec("ALTER TABLE packages ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
  } catch (e) {
    // Column might already exist
    console.log("Notice: packages.updated_at column might already exist.");
  }

  console.log("Migration complete.");
  db.close();
}

migrate().catch(console.error);
