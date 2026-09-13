DO $$
BEGIN
    -- Only apply sequence default if 'id' is not already an identity column and has no default
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'shortbox' 
          AND table_name = 'variant' 
          AND column_name = 'id' 
          AND (is_identity = 'YES' OR column_default IS NOT NULL)
    ) THEN
        CREATE SEQUENCE IF NOT EXISTS shortbox.variant_id_seq;
        
        ALTER TABLE shortbox.variant 
        ALTER COLUMN id SET DEFAULT nextval('shortbox.variant_id_seq');
        
        PERFORM setval('shortbox.variant_id_seq', COALESCE((SELECT MAX(id) FROM shortbox.variant), 0) + 1, false);
    END IF;
END $$;
