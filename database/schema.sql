-- =============================================================
--  MediaHive — Community-Driven Media Discovery Platform
--  MySQL Database Schema
-- =============================================================

CREATE DATABASE IF NOT EXISTS mediahive
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE mediahive;

-- =============================================================
-- 1. USER
-- =============================================================
CREATE TABLE User (
    user_id       CHAR(36)        NOT NULL DEFAULT (UUID()),
    FName         VARCHAR(100)    NOT NULL,
    LName         VARCHAR(100)    NOT NULL,
    email         VARCHAR(255)    NOT NULL,
    password_hash VARCHAR(255)    NOT NULL,
    created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status        VARCHAR(50)     NOT NULL DEFAULT 'active',

    CONSTRAINT pk_user        PRIMARY KEY (user_id),
    CONSTRAINT uq_user_email  UNIQUE      (email)
);

-- =============================================================
-- 2. MEDIA CONTENT  (parent / supertype)
-- =============================================================
CREATE TABLE Media_Content (
    media_id       CHAR(36)        NOT NULL DEFAULT (UUID()),
    title          VARCHAR(255)    NOT NULL,
    release_date   DATE,
    synopsis       TEXT,
    average_rating DECIMAL(3,1)    DEFAULT 0.0,
    poster_url     VARCHAR(500)    DEFAULT NULL,

    CONSTRAINT pk_media PRIMARY KEY (media_id)
);

-- =============================================================
-- 3. MEDIA SUBTYPES  (one-to-one with Media_Content)
-- =============================================================
CREATE TABLE Movie (
    media_id   CHAR(36)        NOT NULL,
    runtime    INT             COMMENT 'Duration in minutes',
    box_office DECIMAL(15, 2)  COMMENT 'Worldwide gross in USD',

    CONSTRAINT pk_movie         PRIMARY KEY (media_id),
    CONSTRAINT fk_movie_media   FOREIGN KEY (media_id)
        REFERENCES Media_Content (media_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE TABLE TV_Series (
    media_id      CHAR(36)     NOT NULL,
    total_seasons INT,
    status        VARCHAR(50)  COMMENT 'e.g. Ongoing, Ended, Cancelled',

    CONSTRAINT pk_tv_series       PRIMARY KEY (media_id),
    CONSTRAINT fk_tv_series_media FOREIGN KEY (media_id)
        REFERENCES Media_Content (media_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE TABLE Anime (
    media_id        CHAR(36)     NOT NULL,
    source_material VARCHAR(100) COMMENT 'e.g. Manga, Light Novel, Original',
    total_episodes  INT,

    CONSTRAINT pk_anime       PRIMARY KEY (media_id),
    CONSTRAINT fk_anime_media FOREIGN KEY (media_id)
        REFERENCES Media_Content (media_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- =============================================================
-- 4. GENRE  (composite PK: media can have multiple genres)
-- =============================================================
CREATE TABLE Genre (
    media_id CHAR(36)    NOT NULL,
    type     VARCHAR(50) NOT NULL,

    CONSTRAINT pk_genre       PRIMARY KEY (media_id, type),
    CONSTRAINT fk_genre_media FOREIGN KEY (media_id)
        REFERENCES Media_Content (media_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- =============================================================
-- 5. MOVIE TAG  (composite PK: movie-level keyword tagging)
-- =============================================================
CREATE TABLE Movie_Tag (
    media_id CHAR(36)     NOT NULL,
    tag_name VARCHAR(100) NOT NULL,

    CONSTRAINT pk_movie_tag       PRIMARY KEY (media_id, tag_name),
    CONSTRAINT fk_movie_tag_movie FOREIGN KEY (media_id)
        REFERENCES Movie (media_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- =============================================================
-- 6. REVIEWS
-- =============================================================
CREATE TABLE Reviews (
    review_id  CHAR(36)   NOT NULL DEFAULT (UUID()),
    user_id    CHAR(36)   NOT NULL,
    media_id   CHAR(36)   NOT NULL,
    body       TEXT       NOT NULL,
    created_at TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_reviews        PRIMARY KEY (review_id),
    CONSTRAINT fk_reviews_user   FOREIGN KEY (user_id)
        REFERENCES User (user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_reviews_media  FOREIGN KEY (media_id)
        REFERENCES Media_Content (media_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE INDEX idx_reviews_user  ON Reviews (user_id);
CREATE INDEX idx_reviews_media ON Reviews (media_id);

-- =============================================================
-- 7. COMMENTS
-- =============================================================
CREATE TABLE Comments (
    comment_id CHAR(36)   NOT NULL DEFAULT (UUID()),
    user_id    CHAR(36)   NOT NULL,
    review_id  CHAR(36)   NOT NULL,
    body       TEXT       NOT NULL,
    created_at TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_comments         PRIMARY KEY (comment_id),
    CONSTRAINT fk_comments_user    FOREIGN KEY (user_id)
        REFERENCES User (user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_comments_review  FOREIGN KEY (review_id)
        REFERENCES Reviews (review_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE INDEX idx_comments_user   ON Comments (user_id);
CREATE INDEX idx_comments_review ON Comments (review_id);

-- =============================================================
-- 8. RATING  (composite PK: one rating per user per media)
-- =============================================================
CREATE TABLE Rating (
    user_id  CHAR(36)     NOT NULL,
    media_id CHAR(36)     NOT NULL,
    score    DECIMAL(3,1) NOT NULL,
    rated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_rating        PRIMARY KEY (user_id, media_id),
    CONSTRAINT chk_rating_score CHECK       (score BETWEEN 0.0 AND 10.0),
    CONSTRAINT fk_rating_user   FOREIGN KEY (user_id)
        REFERENCES User (user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_rating_media  FOREIGN KEY (media_id)
        REFERENCES Media_Content (media_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE INDEX idx_rating_media ON Rating (media_id);

-- =============================================================
-- 9. WATCHLISTS  (composite PK: one entry per user per media)
-- =============================================================
CREATE TABLE Watchlists (
    user_id  CHAR(36)    NOT NULL,
    media_id CHAR(36)    NOT NULL,
    status   VARCHAR(50) NOT NULL DEFAULT 'plan_to_watch'
        COMMENT 'e.g. plan_to_watch, watching, completed, dropped',
    added_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_watchlists        PRIMARY KEY (user_id, media_id),
    CONSTRAINT fk_watchlists_user   FOREIGN KEY (user_id)
        REFERENCES User (user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_watchlists_media  FOREIGN KEY (media_id)
        REFERENCES Media_Content (media_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE INDEX idx_watchlists_media ON Watchlists (media_id);

-- =============================================================
-- 10. RECOMMENDS  (user-to-user media recommendation)
-- =============================================================
CREATE TABLE Recommends (
    user_id1 CHAR(36) NOT NULL,
    user_id2 CHAR(36) NOT NULL,
    media_id CHAR(36) NOT NULL,

    CONSTRAINT pk_recommends          PRIMARY KEY (user_id1, user_id2, media_id),
    CONSTRAINT fk_recommends_sender   FOREIGN KEY (user_id1)
        REFERENCES User (user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_recommends_receiver FOREIGN KEY (user_id2)
        REFERENCES User (user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_recommends_media    FOREIGN KEY (media_id)
        REFERENCES Media_Content (media_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE INDEX idx_recommends_receiver ON Recommends (user_id2);
CREATE INDEX idx_recommends_media    ON Recommends (media_id);

-- =============================================================
-- 11. CUSTOM LIST
-- =============================================================
CREATE TABLE Custom_List (
    list_id     CHAR(36)     NOT NULL DEFAULT (UUID()),
    user_id     CHAR(36)     NOT NULL,
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    is_public   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_custom_list       PRIMARY KEY (list_id),
    CONSTRAINT fk_custom_list_user  FOREIGN KEY (user_id)
        REFERENCES User (user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE INDEX idx_custom_list_user ON Custom_List (user_id);

-- =============================================================
-- 12. LIST ITEM
-- =============================================================
CREATE TABLE List_Item (
    list_id    CHAR(36)   NOT NULL,
    media_id   CHAR(36)   NOT NULL,
    list_rank  INT        DEFAULT NULL,
    added_at   TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_list_item        PRIMARY KEY (list_id, media_id),
    CONSTRAINT fk_list_item_list   FOREIGN KEY (list_id)
        REFERENCES Custom_List (list_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_list_item_media  FOREIGN KEY (media_id)
        REFERENCES Media_Content (media_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE INDEX idx_list_item_media ON List_Item (media_id);

-- =============================================================
-- TRIGGER: auto-update Media_Content.average_rating
--          whenever a Rating row is inserted, updated, or deleted
-- =============================================================
DELIMITER $$

CREATE TRIGGER trg_rating_after_insert
AFTER INSERT ON Rating
FOR EACH ROW
BEGIN
    UPDATE Media_Content
    SET    average_rating = (
               SELECT ROUND(AVG(score), 1)
               FROM   Rating
               WHERE  media_id = NEW.media_id
           )
    WHERE  media_id = NEW.media_id;
END$$

CREATE TRIGGER trg_rating_after_update
AFTER UPDATE ON Rating
FOR EACH ROW
BEGIN
    UPDATE Media_Content
    SET    average_rating = (
               SELECT ROUND(AVG(score), 1)
               FROM   Rating
               WHERE  media_id = NEW.media_id
           )
    WHERE  media_id = NEW.media_id;
END$$

CREATE TRIGGER trg_rating_after_delete
AFTER DELETE ON Rating
FOR EACH ROW
BEGIN
    UPDATE Media_Content
    SET    average_rating = (
               SELECT COALESCE(ROUND(AVG(score), 1), 0.0)
               FROM   Rating
               WHERE  media_id = OLD.media_id
           )
    WHERE  media_id = OLD.media_id;
END$$

DELIMITER ;
