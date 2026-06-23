-- Allow conversation participants to read each other's base profile row.
-- Complements business_profiles / influencer_profiles policies for messaging UI.

DROP POLICY IF EXISTS profiles_select_conversation_peer ON public.profiles;
CREATE POLICY profiles_select_conversation_peer
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.conversation_participants cp_self
      INNER JOIN public.conversation_participants cp_peer
        ON cp_self.conversation_id = cp_peer.conversation_id
      WHERE cp_self.user_id = auth.uid()
        AND cp_peer.user_id = profiles.id
        AND cp_self.user_id <> cp_peer.user_id
    )
  );
