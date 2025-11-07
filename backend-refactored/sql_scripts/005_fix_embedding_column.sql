-- Make embedding column nullable (optional)
ALTER TABLE document_chunks 
MODIFY COLUMN embedding JSON NULL DEFAULT NULL;