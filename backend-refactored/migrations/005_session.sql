-- Express sessions. connect-pg-simple reads this table.
CREATE TABLE IF NOT EXISTS session (
  sid varchar NOT NULL COLLATE "default",
  sess json NOT NULL,
  expire timestamp(6) NOT NULL,
  CONSTRAINT session_pkey PRIMARY KEY (sid)
);

CREATE INDEX IF NOT EXISTS idx_session_expire ON session (expire);
