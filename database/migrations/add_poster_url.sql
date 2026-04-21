-- Migration: add poster_url to Media_Content
-- Run this if you already created the database with the original schema.sql

USE mediahive;

ALTER TABLE Media_Content
    ADD COLUMN poster_url VARCHAR(500) DEFAULT NULL;
