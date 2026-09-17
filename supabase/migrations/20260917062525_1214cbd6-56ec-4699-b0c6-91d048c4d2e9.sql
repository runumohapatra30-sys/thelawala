
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS broadcast_at timestamptz;

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
  broadcasting boolean;
begin
  select id, vendor_id, partner_id, status, rejected_partner_ids, offered_to, offer_expires_at, updated_at, created_at, broadcast_at
    into o from public.orders where id = _order_id;
  if not found or o.partner_id is not null then return null; end if;
  if o.status not in ('SEARCHING_RIDER','READY_FOR_PICKUP','ORDER_ACCEPTED') then return null; end if;

  -- Ten minutes without a rider: give up and refund.
  if o.created_at < now() - interval '10 minutes' then
    perform public.cancel_orders_no_rider();
    return null;
  end if;

  if o.offered_to is not null and o.offer_expires_at is not null and o.offer_expires_at > now() then
    return o.offered_to;
  end if;

  select lat, lng, zone into v from public.vendors where id = o.vendor_id;
  if not found then return null; end if;

  -- Five minutes without a rider: broadcast to everyone eligible.
  broadcasting := o.created_at < now() - interval '5 minutes';
  if broadcasting and o.broadcast_at is null then
    update public.orders set broadcast_at = now(), rejected_partner_ids = '{}'::uuid[] where id = _order_id;
    o.rejected_partner_ids := '{}'::uuid[];
  end if;

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

  -- Everyone nearby declined: reset the declined list and ask again.
  if pick is null and coalesce(array_length(o.rejected_partner_ids,1),0) > 0 then
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
        offer_expires_at = now() + interval '45 seconds',
        status = case when status = 'READY_FOR_PICKUP' then status else 'SEARCHING_RIDER' end
  where id = _order_id;

  return pick;
end;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_orders_no_rider()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r record; n integer := 0;
begin
  for r in
    update public.orders
       set status = 'CANCELLED',
           cancelled_by = 'SYSTEM',
           cancelled_at = now(),
           cancel_reason = 'cancelled_no_rider',
           offered_to = null,
           offer_expires_at = null,
           updated_at = now()
     where partner_id is null
       and status in ('ORDER_PLACED','PREPARING','SEARCHING_RIDER','READY_FOR_PICKUP')
       and created_at < now() - interval '10 minutes'
    returning id, user_id, grand_total, payment_mode, payment_status
  loop
    n := n + 1;
    insert into public.notifications (user_id, title, body, order_id)
    values (r.user_id, 'Order cancelled', 'No delivery partner was available, so your order was cancelled. Any prepaid amount will be refunded.', r.id);

    if coalesce(r.payment_mode,'COD') <> 'COD' and coalesce(r.payment_status,'') in ('PAID','SUCCESS')
       and not exists (select 1 from public.refund_requests rr where rr.order_id = r.id) then
      insert into public.refund_requests (user_id, order_id, amount, reason, method, status)
      values (r.user_id, r.id, coalesce(r.grand_total,0), 'cancelled_no_rider', 'SOURCE', 'REQUESTED');
    end if;
  end loop;
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
  perform public.cancel_orders_no_rider();
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

CREATE OR REPLACE FUNCTION public.accept_order_offer(_order_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare me record; updated integer;
begin
  select id, status, is_online into me
  from public.delivery_partners where user_id = auth.uid();
  if not found or me.status <> 'APPROVED' or me.is_online is not true then
    raise exception 'Your partner account is not approved or you are off duty';
  end if;

  update public.orders
     set partner_id = me.id,
         status = 'RIDER_ASSIGNED',
         offered_to = null,
         offer_expires_at = null,
         accepted_at = now(),
         updated_at = now()
   where id = _order_id
     and partner_id is null
     and status in ('SEARCHING_RIDER','READY_FOR_PICKUP','ORDER_ACCEPTED')
     and (offered_to = me.id or broadcast_at is not null);
  get diagnostics updated = row_count;

  if updated = 0 then return false; end if;
  update public.delivery_partners set is_busy = true where id = me.id;
  return true;
end;
$function$;

GRANT EXECUTE ON FUNCTION public.accept_order_offer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_orders_no_rider() TO authenticated;
