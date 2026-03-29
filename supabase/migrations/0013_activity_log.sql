-- Activity log table for append-only trip event history
CREATE TABLE IF NOT EXISTS public.trip_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_user_id uuid REFERENCES auth.users(id),
  actor_member_id uuid REFERENCES public.trip_members(id) ON DELETE SET NULL,
  entity_type text,
  entity_id uuid,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trip_activity_log_trip_id_idx
  ON public.trip_activity_log(trip_id, created_at DESC);

ALTER TABLE public.trip_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trip members can view activity log"
  ON public.trip_activity_log
  FOR SELECT
  USING (is_trip_creator(trip_id) OR is_trip_member(trip_id));

-- Only triggers (SECURITY DEFINER) may insert rows — no direct INSERT policy.

-- Trigger function that logs events for expenses, members, settlements, and trip status changes
CREATE OR REPLACE FUNCTION public.log_trip_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip_id uuid;
  v_event_type text;
  v_actor_user_id uuid;
  v_actor_member_id uuid;
  v_actor_display_name text;
  v_entity_type text;
  v_entity_id uuid;
  v_payload jsonb;
  v_paid_by_name text;
  v_from_name text;
  v_to_name text;
BEGIN
  v_actor_user_id := auth.uid();

  SELECT display_name INTO v_actor_display_name
  FROM public.users WHERE id = v_actor_user_id;

  -- ── expenses ──────────────────────────────────────────────────────────────
  IF TG_TABLE_NAME = 'expenses' THEN
    v_entity_type := 'expense';

    IF TG_OP = 'INSERT' THEN
      v_trip_id    := NEW.trip_id;
      v_entity_id  := NEW.id;
      v_event_type := 'expense_added';
      SELECT display_name INTO v_paid_by_name FROM public.trip_members WHERE id = NEW.paid_by_member_id;
      v_payload := jsonb_build_object(
        'actor_display_name', v_actor_display_name,
        'amount',             NEW.amount,
        'currency_code',      NEW.currency_code,
        'trip_amount',        NEW.trip_amount,
        'category',           NEW.category,
        'custom_category',    NEW.custom_category,
        'note',               NEW.note,
        'paid_by_name',       v_paid_by_name
      );

    ELSIF TG_OP = 'UPDATE' THEN
      v_trip_id    := NEW.trip_id;
      v_entity_id  := NEW.id;
      v_event_type := 'expense_edited';
      SELECT display_name INTO v_paid_by_name FROM public.trip_members WHERE id = NEW.paid_by_member_id;
      v_payload := jsonb_build_object(
        'actor_display_name', v_actor_display_name,
        'amount',             NEW.amount,
        'currency_code',      NEW.currency_code,
        'trip_amount',        NEW.trip_amount,
        'category',           NEW.category,
        'custom_category',    NEW.custom_category,
        'note',               NEW.note,
        'paid_by_name',       v_paid_by_name
      );

    ELSIF TG_OP = 'DELETE' THEN
      v_trip_id    := OLD.trip_id;
      v_entity_id  := OLD.id;
      v_event_type := 'expense_deleted';
      v_payload := jsonb_build_object(
        'actor_display_name', v_actor_display_name,
        'amount',             OLD.amount,
        'currency_code',      OLD.currency_code,
        'category',           OLD.category,
        'note',               OLD.note
      );
    END IF;

  -- ── trip_members ──────────────────────────────────────────────────────────
  ELSIF TG_TABLE_NAME = 'trip_members' THEN
    v_entity_type := 'member';
    v_trip_id    := COALESCE(NEW.trip_id, OLD.trip_id);
    v_entity_id  := COALESCE(NEW.id, OLD.id);

    IF TG_OP = 'INSERT' THEN
      v_event_type := 'member_added';
      v_payload := jsonb_build_object(
        'actor_display_name',  v_actor_display_name,
        'member_display_name', NEW.display_name
      );

    ELSIF TG_OP = 'UPDATE' THEN
      IF OLD.status != 'removed' AND NEW.status = 'removed' THEN
        v_event_type := 'member_removed';
        v_payload := jsonb_build_object(
          'actor_display_name',  v_actor_display_name,
          'member_display_name', OLD.display_name
        );
      ELSIF OLD.user_id IS NULL AND NEW.user_id IS NOT NULL THEN
        v_event_type := 'member_claimed';
        v_payload := jsonb_build_object(
          'actor_display_name',  COALESCE(v_actor_display_name, NEW.display_name),
          'member_display_name', NEW.display_name
        );
      ELSE
        RETURN NEW;
      END IF;
    END IF;

  -- ── trip_settlement_transfers ─────────────────────────────────────────────
  ELSIF TG_TABLE_NAME = 'trip_settlement_transfers' THEN
    v_entity_type := 'settlement';
    v_trip_id   := COALESCE(NEW.trip_id, OLD.trip_id);
    v_entity_id := COALESCE(NEW.id, OLD.id);

    IF TG_OP != 'UPDATE' THEN
      RETURN COALESCE(NEW, OLD);
    END IF;

    -- Resolve display names
    IF NEW.from_member_id IS NOT NULL THEN
      SELECT display_name INTO v_from_name FROM public.trip_members WHERE id = NEW.from_member_id;
    ELSIF NEW.from_group_id IS NOT NULL THEN
      SELECT name INTO v_from_name FROM public.trip_groups WHERE id = NEW.from_group_id;
    END IF;

    IF NEW.to_member_id IS NOT NULL THEN
      SELECT display_name INTO v_to_name FROM public.trip_members WHERE id = NEW.to_member_id;
    ELSIF NEW.to_group_id IS NOT NULL THEN
      SELECT name INTO v_to_name FROM public.trip_groups WHERE id = NEW.to_group_id;
    END IF;

    IF OLD.status = 'pending' AND NEW.status = 'paid' THEN
      v_event_type := 'settlement_paid';
      v_payload := jsonb_build_object(
        'actor_display_name', v_actor_display_name,
        'amount',             NEW.amount,
        'currency_code',      NEW.currency_code,
        'from_display_name',  COALESCE(v_from_name, 'Unknown'),
        'to_display_name',    COALESCE(v_to_name, 'Unknown')
      );
    ELSIF OLD.status = 'paid' AND NEW.status = 'confirmed' THEN
      v_event_type := 'settlement_confirmed';
      v_payload := jsonb_build_object(
        'actor_display_name', v_actor_display_name,
        'amount',             NEW.amount,
        'currency_code',      NEW.currency_code,
        'from_display_name',  COALESCE(v_from_name, 'Unknown'),
        'to_display_name',    COALESCE(v_to_name, 'Unknown')
      );
    ELSE
      RETURN NEW;
    END IF;

  -- ── trips (status changes only) ───────────────────────────────────────────
  ELSIF TG_TABLE_NAME = 'trips' THEN
    v_entity_type := 'trip';
    v_trip_id   := COALESCE(NEW.id, OLD.id);
    v_entity_id := v_trip_id;

    IF TG_OP != 'UPDATE' THEN
      RETURN COALESCE(NEW, OLD);
    END IF;

    IF OLD.status = 'active' AND NEW.status = 'completed' THEN
      v_event_type := 'trip_completed';
      v_payload := jsonb_build_object('actor_display_name', v_actor_display_name);
    ELSIF OLD.status = 'completed' AND NEW.status = 'settled' THEN
      v_event_type := 'trip_settled';
      v_payload := jsonb_build_object('actor_display_name', v_actor_display_name);
    ELSE
      RETURN NEW;
    END IF;

  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Resolve actor's trip member record
  SELECT id INTO v_actor_member_id
  FROM public.trip_members
  WHERE trip_id = v_trip_id
    AND user_id = v_actor_user_id
    AND status = 'active'
  LIMIT 1;

  INSERT INTO public.trip_activity_log (
    trip_id, event_type, actor_user_id, actor_member_id,
    entity_type, entity_id, payload
  ) VALUES (
    v_trip_id, v_event_type, v_actor_user_id, v_actor_member_id,
    v_entity_type, v_entity_id, v_payload
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach triggers
CREATE TRIGGER log_expense_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.log_trip_activity();

CREATE TRIGGER log_member_activity
  AFTER INSERT OR UPDATE ON public.trip_members
  FOR EACH ROW EXECUTE FUNCTION public.log_trip_activity();

CREATE TRIGGER log_settlement_activity
  AFTER UPDATE ON public.trip_settlement_transfers
  FOR EACH ROW EXECUTE FUNCTION public.log_trip_activity();

CREATE TRIGGER log_trip_status_activity
  AFTER UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.log_trip_activity();
