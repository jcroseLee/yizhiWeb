-- Create table for AI analysis requests
CREATE TABLE IF NOT EXISTS ai_analysis_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL UNIQUE,
  amount INTEGER NOT NULL DEFAULT 50,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  request_payload JSONB,
  result_payload JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_analysis_requests_idempotency_key ON ai_analysis_requests(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_requests_user_id ON ai_analysis_requests(user_id);

-- RPC to consume coins idempotently
CREATE OR REPLACE FUNCTION consume_yi_coins_idempotent(
  p_user_id UUID,
  p_amount INTEGER,
  p_idempotency_key TEXT,
  p_description TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance INTEGER;
  v_request_status TEXT;
  v_request_id UUID;
BEGIN
  -- 1. Check idempotency
  SELECT status, id INTO v_request_status, v_request_id
  FROM ai_analysis_requests
  WHERE idempotency_key = p_idempotency_key;

  IF FOUND THEN
    -- If already processing or completed, return success (idempotent)
    IF v_request_status IN ('processing', 'completed') THEN
       RETURN jsonb_build_object('success', true, 'message', 'Already processed', 'status', v_request_status, 'request_id', v_request_id, 'is_replay', true);
    END IF;
    -- If failed or refunded, we assume it's a new attempt (if the client generates a NEW key).
    -- But if the client sends the SAME key, we should return the previous state.
    RETURN jsonb_build_object('success', false, 'message', 'Duplicate request with failed/refunded status', 'status', v_request_status, 'request_id', v_request_id, 'is_replay', true);
  END IF;

  -- 2. Check balance
  SELECT yi_coins INTO v_current_balance
  FROM profiles
  WHERE id = p_user_id;

  IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'message', 'Insufficient balance');
  END IF;

  -- 3. Deduct coins
  UPDATE profiles
  SET yi_coins = yi_coins - p_amount
  WHERE id = p_user_id;

  -- 4. Insert transaction
  INSERT INTO coin_transactions (user_id, amount, type, description)
  VALUES (p_user_id, -p_amount, 'ai_analysis', p_description);

  -- 5. Create request record
  INSERT INTO ai_analysis_requests (user_id, idempotency_key, amount, status)
  VALUES (p_user_id, p_idempotency_key, p_amount, 'processing')
  RETURNING id INTO v_request_id;

  RETURN jsonb_build_object('success', true, 'message', 'Deducted successfully', 'request_id', v_request_id, 'is_replay', false);
END;
$$;

-- RPC to handle failure and refund
CREATE OR REPLACE FUNCTION refund_ai_analysis(
  p_request_id UUID,
  p_reason TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_amount INTEGER;
  v_status TEXT;
BEGIN
  -- Get request details
  SELECT user_id, amount, status INTO v_user_id, v_amount, v_status
  FROM ai_analysis_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Request not found');
  END IF;

  IF v_status = 'refunded' THEN
     RETURN jsonb_build_object('success', true, 'message', 'Already refunded');
  END IF;

  -- Update request status
  UPDATE ai_analysis_requests
  SET status = 'refunded',
      error_message = p_reason,
      updated_at = now()
  WHERE id = p_request_id;

  -- Refund coins
  UPDATE profiles
  SET yi_coins = yi_coins + v_amount
  WHERE id = v_user_id;

  -- Insert refund transaction
  INSERT INTO coin_transactions (user_id, amount, type, description)
  VALUES (v_user_id, v_amount, 'refund', 'AI Analysis Refund: ' || p_reason);

  RETURN jsonb_build_object('success', true, 'message', 'Refunded successfully');
END;
$$;

-- RPC to complete the request (mark as completed)
CREATE OR REPLACE FUNCTION complete_ai_analysis(
  p_request_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE ai_analysis_requests
  SET status = 'completed',
      updated_at = now()
  WHERE id = p_request_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$;
