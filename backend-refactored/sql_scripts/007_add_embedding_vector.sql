-- Add embedding vector column to document_chunks
ALTER TABLE document_chunks 
ADD COLUMN embedding_vector LONGTEXT NULL;

