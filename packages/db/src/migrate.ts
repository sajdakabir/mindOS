import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

async function runMigrations() {
	const connectionString = process.env.DATABASE_URL;
	if (!connectionString) {
		throw new Error("DATABASE_URL is required");
	}

	const pool = new pg.Pool({ connectionString });
	const db = drizzle(pool);

	console.log("Running migrations...");

	// Enable pgvector extension
	await pool.query("CREATE EXTENSION IF NOT EXISTS vector;");
	console.log("pgvector extension enabled");

	// Run drizzle migrations
	await migrate(db, { migrationsFolder: "./drizzle" });
	console.log("Migrations complete");

	// Create custom SQL for vector columns and triggers
	// (Drizzle doesn't natively support pgvector columns yet,
	//  so we add them via raw SQL after the base migration)
	await pool.query(`
		-- Add embedding column to memories if not exists
		DO $$ BEGIN
			ALTER TABLE memories ADD COLUMN IF NOT EXISTS embedding vector(1536);
		EXCEPTION WHEN undefined_object THEN
			NULL;
		END $$;

		-- Add embedding column to facts if not exists
		DO $$ BEGIN
			ALTER TABLE facts ADD COLUMN IF NOT EXISTS embedding vector(1536);
		EXCEPTION WHEN undefined_object THEN
			NULL;
		END $$;

		-- Add tsvector column for full-text search
		ALTER TABLE memories ADD COLUMN IF NOT EXISTS search_vector tsvector;

		-- Create HNSW indexes for vector similarity search
		CREATE INDEX IF NOT EXISTS memories_embedding_idx
			ON memories USING hnsw (embedding vector_cosine_ops);

		CREATE INDEX IF NOT EXISTS facts_embedding_idx
			ON facts USING hnsw (embedding vector_cosine_ops);

		-- Create GIN index for full-text search
		CREATE INDEX IF NOT EXISTS memories_search_vector_idx
			ON memories USING gin (search_vector);

		-- Create trigger to auto-update search_vector
		CREATE OR REPLACE FUNCTION update_search_vector() RETURNS trigger AS $$
		BEGIN
			NEW.search_vector := to_tsvector('english', COALESCE(NEW.content, ''));
			RETURN NEW;
		END;
		$$ LANGUAGE plpgsql;

		DROP TRIGGER IF EXISTS memories_search_vector_trigger ON memories;
		CREATE TRIGGER memories_search_vector_trigger
			BEFORE INSERT OR UPDATE OF content ON memories
			FOR EACH ROW EXECUTE FUNCTION update_search_vector();
	`);
	console.log("Vector columns, indexes, and triggers created");

	await pool.end();
	process.exit(0);
}

runMigrations().catch((err) => {
	console.error("Migration failed:", err);
	process.exit(1);
});
