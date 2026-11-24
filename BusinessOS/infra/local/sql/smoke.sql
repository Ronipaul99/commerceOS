DO $$
BEGIN
    IF current_database() <> 'businessos_test' THEN
        RAISE EXCEPTION 'Expected the isolated test database';
    END IF;
    IF (SELECT count(*) FROM local_fixture.tenant) <> 2 OR
       (SELECT count(*) FROM local_fixture.branch) <> 3 OR
       (SELECT count(*) FROM local_fixture.branch_marker WHERE fixture_key = 'shared-marker') <> 2 THEN
        RAISE EXCEPTION 'Expected isolated, repeatable fixture records';
    END IF;

    BEGIN
        INSERT INTO local_fixture.branch_marker (tenant_id, branch_code, fixture_key)
        VALUES ('A', 'B1', 'cross-tenant');
        RAISE EXCEPTION 'A cross-tenant branch reference was accepted';
    EXCEPTION WHEN foreign_key_violation THEN
        NULL;
    END;
END
$$;
