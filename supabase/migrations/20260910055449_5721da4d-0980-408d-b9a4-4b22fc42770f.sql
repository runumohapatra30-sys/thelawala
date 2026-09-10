CREATE OR REPLACE FUNCTION public.dispatch_order(_order_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  if pick is null and coalesce(array_length(o.rejected_partner_ids,1),0) > 0 then
    if coalesce(o.offer_expires_at, o.updated_at) > now() - interval '15 seconds' then
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
$$;