-- Up Migration

CREATE TABLE Account
(
    accountId serial PRIMARY KEY,
    accountName VARCHAR ( 50 ) UNIQUE NOT NULL,
    created_on TIMESTAMP NOT NULL,
    last_update TIMESTAMP
);