DO $$
BEGIN
    -- Only apply sequence default if 'id' is not already an identity column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'shortbox' 
          AND table_name = 'admin_task_result' 
          AND column_name = 'id' 
          AND is_identity = 'YES'
    ) THEN
        CREATE SEQUENCE IF NOT EXISTS shortbox.admin_task_result_id_seq;
        
        ALTER TABLE shortbox.admin_task_result 
        ALTER COLUMN id SET DEFAULT nextval('shortbox.admin_task_result_id_seq');
        
        PERFORM setval('shortbox.admin_task_result_id_seq', COALESCE((SELECT MAX(id) FROM shortbox.admin_task_result), 0) + 1, false);
    END IF;
END $$;
