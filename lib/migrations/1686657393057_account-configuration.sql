-- Up Migration

CREATE TABLE AccountConfiguration
(
    accountId serial PRIMARY KEY,
    enableFeatureX boolean,
    enableFeatureY boolean,
    enableFeatureZ boolean,
    created_on DATE DEFAULT CURRENT_DATE
);