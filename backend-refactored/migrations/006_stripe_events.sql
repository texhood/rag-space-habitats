-- Stripe webhook ids already applied. A second delivery of the same event is ignored.
CREATE TABLE IF NOT EXISTS stripe_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);
