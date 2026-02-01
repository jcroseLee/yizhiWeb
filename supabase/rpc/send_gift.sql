-- Create gift_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS gift_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  receiver_id UUID NOT NULL REFERENCES profiles(id),
  gift_type TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add income and charm columns to profiles if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'income') THEN
        ALTER TABLE profiles ADD COLUMN income DECIMAL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'charm') THEN
        ALTER TABLE profiles ADD COLUMN charm DECIMAL DEFAULT 0;
    END IF;
END $$;

-- Create or replace the send_gift function
CREATE OR REPLACE FUNCTION send_gift(
  p_sender_id UUID,
  p_receiver_id UUID,
  p_gift_type TEXT,
  p_amount DECIMAL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sender_free DECIMAL;
  v_sender_paid DECIMAL;
  v_total_balance DECIMAL;
  v_deduct_free DECIMAL := 0;
  v_deduct_paid DECIMAL := 0;
BEGIN
  -- 1. Verify Sender and Lock Row
  SELECT coin_free, coin_paid INTO v_sender_free, v_sender_paid
  FROM profiles
  WHERE id = p_sender_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Sender not found', 'code', 404);
  END IF;

  -- 2. Check Balance
  v_total_balance := COALESCE(v_sender_free, 0) + COALESCE(v_sender_paid, 0);

  IF v_total_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'message', 'Insufficient balance', 'code', 403);
  END IF;

  -- 3. Calculate Deduction (Prioritize Free Coins)
  IF COALESCE(v_sender_free, 0) >= p_amount THEN
    v_deduct_free := p_amount;
  ELSE
    v_deduct_free := COALESCE(v_sender_free, 0);
    v_deduct_paid := p_amount - v_deduct_free;
  END IF;

  -- 4. Deduct from Sender
  UPDATE profiles
  SET 
    coin_free = coin_free - v_deduct_free,
    coin_paid = coin_paid - v_deduct_paid
  WHERE id = p_sender_id;

  -- 5. Update Receiver (Lock Row)
  PERFORM 1 FROM profiles WHERE id = p_receiver_id FOR UPDATE;
  
  IF NOT FOUND THEN
     RAISE EXCEPTION 'Receiver not found';
  END IF;

  UPDATE profiles
  SET 
    income = COALESCE(income, 0) + p_amount,
    charm = COALESCE(charm, 0) + p_amount
  WHERE id = p_receiver_id;

  -- 6. Log Transaction (Sender Side)
  INSERT INTO coin_transactions (user_id, amount, type, description, balance_type, created_at)
  VALUES (
    p_sender_id, 
    -p_amount, 
    'GIFT_SEND', 
    'Send gift ' || p_gift_type || ' to user ' || p_receiver_id, 
    CASE WHEN v_deduct_paid > 0 THEN 'PAID' ELSE 'FREE' END, 
    NOW()
  );

  -- 7. Log Gift Transaction (Audit Log)
  INSERT INTO gift_logs (sender_id, receiver_id, gift_type, amount, created_at)
  VALUES (p_sender_id, p_receiver_id, p_gift_type, p_amount, NOW());

  -- 8. Return Success
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Gift sent successfully', 
    'data', jsonb_build_object(
      'deducted_free', v_deduct_free,
      'deducted_paid', v_deduct_paid,
      'amount', p_amount,
      'timestamp', NOW()
    )
  );

EXCEPTION WHEN OTHERS THEN
  -- Rollback is handled automatically by Postgres for the transaction if exception is raised
  -- But we want to return a JSON error if possible.
  -- However, in plpgsql, if we catch exception, the transaction is not rolled back unless we re-raise or were in a sub-transaction?
  -- Actually, "Exception block catches the error and the transaction is not aborted" - correct.
  -- So if I catch and return JSON, the changes might PERSIST if I don't rollback?
  -- No, "When an error is caught... all changes... within the block are rolled back".
  -- So if I catch, the updates in the block are undone.
  RETURN jsonb_build_object('success', false, 'message', SQLERRM, 'code', 500);
END;
$$;
