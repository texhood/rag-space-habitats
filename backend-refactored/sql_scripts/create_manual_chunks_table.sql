DROP TABLE IF EXISTS manual_chunks;
CREATE TABLE manual_chunks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  content TEXT NOT NULL,
  embedding BLOB NOT NULL,
  metadata JSON,
  INDEX content_idx (content(500))
);