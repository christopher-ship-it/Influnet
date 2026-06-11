-- Recommended after 002: reliable 1:1 conversation creation (Message Brand / Message button)
-- Fixes edge cases where RLS blocks adding the second participant from the client.

CREATE OR REPLACE FUNCTION public.ensure_conversation(other_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me UUID := auth.uid();
  cid UUID;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF other_user_id IS NULL OR other_user_id = me THEN
    RAISE EXCEPTION 'Invalid other user';
  END IF;

  SELECT cp1.conversation_id INTO cid
  FROM public.conversation_participants cp1
  INNER JOIN public.conversation_participants cp2
    ON cp2.conversation_id = cp1.conversation_id
  WHERE cp1.user_id = me AND cp2.user_id = other_user_id
  LIMIT 1;

  IF cid IS NOT NULL THEN
    RETURN cid;
  END IF;

  INSERT INTO public.conversations DEFAULT VALUES
  RETURNING id INTO cid;

  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES (cid, me), (cid, other_user_id);

  RETURN cid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_conversation(UUID) TO authenticated;
