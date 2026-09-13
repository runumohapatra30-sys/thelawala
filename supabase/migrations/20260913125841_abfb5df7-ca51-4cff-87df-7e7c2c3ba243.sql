
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
    and not exists (
      select 1 from public.orders ao
      where ao.partner_id = d.id
        and ao.status in ('RIDER_ASSIGNED','ARRIVED_AT_STALL','PICKED_UP','OUT_FOR_DELIVERY','READY_FOR_PICKUP','ORDER_ACCEPTED')
    )
    and not (d.id = any(coalesce(o.rejected_partner_ids, '{}'::uuid[])))
    and (v.zone is null or coalesce(array_length(d.assigned_zones,1),0) = 0 or v.zone = any(d.assigned_zones))
  order by
    case when d.lat is null or d.lng is null then 1 else 0 end,
    (abs(coalesce(d.lat,0) - coalesce(v.lat,0)) + abs(coalesce(d.lng,0) - coalesce(v.lng,0)))
  limit 1;

  -- Everyone nearby has declined: wait ~50 seconds, then ask the whole list again.
  if pick is null and coalesce(array_length(o.rejected_partner_ids,1),0) > 0 then
    if coalesce(o.offer_expires_at, o.updated_at) > now() - interval '50 seconds' then
      return null;
    end if;
    update public.orders set rejected_partner_ids = '{}'::uuid[] where id = _order_id;
    select d.id into pick
    from public.delivery_partners d
    where d.status = 'APPROVED' and d.is_online = true and d.is_busy = false
      and not exists (
        select 1 from public.orders ao
        where ao.partner_id = d.id
          and ao.status in ('RIDER_ASSIGNED','ARRIVED_AT_STALL','PICKED_UP','OUT_FOR_DELIVERY','READY_FOR_PICKUP','ORDER_ACCEPTED')
      )
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

CREATE OR REPLACE FUNCTION public.auto_cancel_stale_orders()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare n integer := 0;
begin
  with stale as (
    update public.orders
       set status = 'CANCELLED',
           cancelled_by = 'SYSTEM',
           cancelled_at = now(),
           cancel_reason = 'No delivery partner found within 30 minutes',
           offered_to = null,
           offer_expires_at = null,
           updated_at = now()
     where partner_id is null
       and status in ('ORDER_PLACED','PREPARING','SEARCHING_RIDER','READY_FOR_PICKUP')
       and created_at < now() - interval '30 minutes'
    returning 1
  )
  select count(*) into n from stale;
  return n;
end;
$function$;

CREATE OR REPLACE FUNCTION public.sweep_dispatch()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r record; n integer := 0;
begin
  perform public.auto_cancel_stale_orders();
  for r in
    select id from public.orders
    where partner_id is null
      and status in ('SEARCHING_RIDER','READY_FOR_PICKUP')
      and (offered_to is null or offer_expires_at is null or offer_expires_at < now())
    order by created_at
    limit 25
  loop
    perform public.dispatch_order(r.id);
    n := n + 1;
  end loop;
  return n;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_assign_partner(_order_id uuid, _partner_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare o public.orders;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Admins only'; end if;
  select * into o from public.orders where id = _order_id for update;
  if o.id is null then raise exception 'Order not found'; end if;
  if o.status = 'DELIVERED' or o.status = 'CANCELLED' then raise exception 'Order is already closed'; end if;

  update public.orders
     set partner_id = _partner_id,
         offered_to = null,
         offer_expires_at = null,
         rejected_partner_ids = '{}'::uuid[],
         status = 'RIDER_ASSIGNED',
         accepted_at = coalesce(accepted_at, now()),
         updated_at = now()
   where id = _order_id;

  if o.partner_id is not null and o.partner_id <> _partner_id then
    update public.delivery_partners set is_busy = false, updated_at = now() where id = o.partner_id;
  end if;
  update public.delivery_partners set is_busy = true, updated_at = now() where id = _partner_id;
end;
$function$;

REVOKE ALL ON FUNCTION public.admin_assign_partner(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_assign_partner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_cancel_stale_orders() TO authenticated;
