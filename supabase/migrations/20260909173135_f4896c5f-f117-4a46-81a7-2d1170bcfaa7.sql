ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE public.delivery_partners ADD COLUMN IF NOT EXISTS rejection_reason text;

CREATE OR REPLACE FUNCTION public.dispatch_order(_order_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  o record;
  v record;
  pick uuid;
begin
  select id, vendor_id, partner_id, status, rejected_partner_ids, offered_to, offer_expires_at, updated_at
    into o from public.orders where id = _order_id;
  if not found or o.partner_id is not null then return null; end if;
  if o.status not in ('SEARCHING_RIDER','READY_FOR_PICKUP','ORDER_ACCEPTED') then return null; end if;
  if o.offered_to is not null and o.offer_expires_at is not null and o.offer_expires_at > now() then
    return o.offered_to;
  end if;

  select lat, lng, zone into v from public.vendors where id = o.vendor_id;
  if not found then return null; end if;

  select d.id into pick
  from public.delivery_partners d
  where d.status = 'APPROVED'
    and d.is_online = true
    and d.is_busy = false
    and not (d.id = any(coalesce(o.rejected_partner_ids, '{}'::uuid[])))
    and (v.zone is null or coalesce(array_length(d.assigned_zones,1),0) = 0 or v.zone = any(d.assigned_zones))
  order by
    case when d.lat is null or d.lng is null then 1 else 0 end,
    (abs(coalesce(d.lat,0) - coalesce(v.lat,0)) + abs(coalesce(d.lng,0) - coalesce(v.lng,0)))
  limit 1;

  -- Everyone nearby passed: wait a 15 second grace window, then start the loop again.
  if pick is null and coalesce(array_length(o.rejected_partner_ids,1),0) > 0 then
    if coalesce(o.offer_expires_at, o.updated_at) > now() - interval '15 seconds' then
      return null;
    end if;
    update public.orders set rejected_partner_ids = '{}'::uuid[] where id = _order_id;
    select d.id into pick
    from public.delivery_partners d
    where d.status = 'APPROVED' and d.is_online = true and d.is_busy = false
      and (v.zone is null or coalesce(array_length(d.assigned_zones,1),0) = 0 or v.zone = any(d.assigned_zones))
    order by
      case when d.lat is null or d.lng is null then 1 else 0 end,
      (abs(coalesce(d.lat,0) - coalesce(v.lat,0)) + abs(coalesce(d.lng,0) - coalesce(v.lng,0)))
    limit 1;
  end if;

  if pick is null then
    update public.orders
      set offered_to = null, offer_expires_at = null,
          status = case when status = 'READY_FOR_PICKUP' then status else 'SEARCHING_RIDER' end
    where id = _order_id;
    return null;
  end if;

  update public.orders
    set offered_to = pick,
        offer_expires_at = now() + interval '30 seconds',
        status = case when status = 'READY_FOR_PICKUP' then status else 'SEARCHING_RIDER' end
  where id = _order_id;

  return pick;
end;
$function$;

CREATE OR REPLACE FUNCTION public.orders_auto_dispatch()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  IF NEW.partner_id IS NULL AND NEW.status IN ('SEARCHING_RIDER','READY_FOR_PICKUP') THEN
    PERFORM public.dispatch_order(NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS t_orders_auto_dispatch ON public.orders;
CREATE TRIGGER t_orders_auto_dispatch
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.orders_auto_dispatch();