WITH
    pushed AS (
        SELECT * FROM hpcc_scan('regress::multi::dg_flat') WHERE dg_parentid < 3
    ),
    residual AS (
        SELECT * FROM hpcc_scan('regress::multi::dg_flat') WHERE dg_parentid + 0 < 3
    ),
    mixed AS (
        SELECT * FROM hpcc_scan('regress::multi::dg_flat')
        WHERE dg_parentid < 3 AND dg_parentid + 0 < 3
    )
SELECT
    NOT EXISTS (SELECT * FROM pushed EXCEPT ALL SELECT * FROM residual)
        AND NOT EXISTS (SELECT * FROM residual EXCEPT ALL SELECT * FROM pushed) AS pushed_matches_residual,
    NOT EXISTS (SELECT * FROM pushed EXCEPT ALL SELECT * FROM mixed)
        AND NOT EXISTS (SELECT * FROM mixed EXCEPT ALL SELECT * FROM pushed) AS pushed_matches_mixed;
